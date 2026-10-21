"use client";

import { useState } from "react";
import { buildYouTubeHtml } from "@/src/lib/functions";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Genre, Score } from "@/src/lib/firestore/types";
import { ScoreFileListModal } from "@/src/features/scores/components/ScoreFileListModal";
import styles from "./ScoreConfirmClient.module.css";

type Props = {
  scoreData: Score;
  allGenres: Genre[];
  scoreId: string;
};

export function ScoreConfirmClient({ scoreData, allGenres, scoreId }: Props) {
  const [isOpenModal, setIsOpenModal] = useState(false);

  // ジャンル名の解決ロジック
  const genreNames = scoreData.genres
    ?.map((gid) => allGenres.find((g) => g.id === gid)?.name)
    .filter(Boolean)
    .join("、");

  const fileCount =
    (scoreData.files?.length || 0) +
    (scoreData.scoreUrl && (!scoreData.files || scoreData.files.length === 0) ? 1 : 0);

  return (
    <BaseLayout>
      <ConfirmLayout
        name="譜面"
        icon="fa-solid fa-music"
        basePath="/score"
        dataId={scoreId}
        featureIdKey="scoreId"
        collectionName="scores"
      >
        <DisplayField label="タイトル">
          {scoreData.title}
        </DisplayField>

        <DisplayField label="譜面">
          {fileCount > 0 ? (
            <div className={styles.scoreLinkContainer}>
              <button 
                type="button"
                className={styles.scoreLink}
                onClick={() => setIsOpenModal(true)}
              >
                <div className={styles.iconWrapper}>
                  <i className="fa-solid fa-music"></i>
                </div>
                <div className={styles.textContainer}>
                  <span className={styles.linkTitle}>譜面を見る ♪</span>
                  <span className={styles.linkSub}>タップしてファイル一覧を表示 ({fileCount}件)</span>
                </div>
                <i className={`fas fa-arrow-up-right-from-square ${styles.arrowIcon}`}></i>
              </button>
            </div>
          ) : "未設定"}
        </DisplayField>

        <DisplayField label="参考音源">
          {scoreData.referenceTrack ? (
            <div 
              className="youtube-display-area"
              dangerouslySetInnerHTML={{ 
                __html: buildYouTubeHtml(scoreData.referenceTrack) 
              }} 
            />
          ) : "未設定"}
        </DisplayField>

        <DisplayField label="ジャンル">
          {genreNames}
        </DisplayField>

        <DisplayField label="略称(譜割用)">
          {scoreData.abbreviation}
        </DisplayField>

        <DisplayField label="備考" preWrap>
          {scoreData.note}
        </DisplayField>

        <DisplayField label="ホームに表示">
          {scoreData.isDispTop ? "表示する" : "表示しない"}
        </DisplayField>
      </ConfirmLayout>

      <ScoreFileListModal
        isOpen={isOpenModal}
        onClose={() => setIsOpenModal(false)}
        title={scoreData.title}
        scoreId={scoreId}
        files={scoreData.files}
        legacyScoreUrl={scoreData.scoreUrl}
      />
    </BaseLayout>
  );
}