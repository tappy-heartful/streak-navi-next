"use client";

import { useState } from "react";
import { buildYouTubeHtml } from "@/src/lib/functions";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Genre, Score, Section, Instrument } from "@/src/lib/firestore/types";
import { ScoreFileListModal } from "@/src/features/scores/components/ScoreFileListModal";
import styles from "./ScoreConfirmClient.module.css";

type Props = {
  scoreData: Score;
  allGenres: Genre[];
  scoreId: string;
  allSections?: Section[];
  allInstruments?: Instrument[];
};

export function ScoreConfirmClient({
  scoreData,
  allGenres,
  scoreId,
  allSections = [],
  allInstruments = [],
}: Props) {
  const [isOpenModal, setIsOpenModal] = useState(false);

  // ジャンル名の解決ロジック
  const genreNames = scoreData.genres
    ?.map((gid) => allGenres.find((g) => g.id === gid)?.name)
    .filter(Boolean)
    .join("、");

  const fileCount =
    (scoreData.files?.length || 0) +
    (scoreData.scoreUrl && (!scoreData.files || scoreData.files.length === 0) ? 1 : 0);

  const instrumentConfig = scoreData.instrumentConfig || {};
  const hasInstruments = Object.values(instrumentConfig).some((parts) => parts && parts.length > 0);
  const solos = scoreData.solos || [];
  const features = scoreData.features || [];

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

        {/* 楽器構成・パート構成 */}
        <DisplayField label="楽器構成・パート構成">
          {hasInstruments ? (
            <div className={styles.instrumentGrid}>
              {allSections.map((sec) => {
                const parts = instrumentConfig[sec.id] || [];
                if (parts.length === 0) return null;

                return (
                  <div key={sec.id} className={styles.sectionCard}>
                    <div className={styles.sectionCardHeader}>
                      <div
                        className={styles.sectionColorIndicator}
                        style={{ backgroundColor: (sec as any).color || "#0284c7" }}
                      />
                      <span className={styles.sectionName}>
                        {sec.name} ({parts.length})
                      </span>
                    </div>
                    <div className={styles.partPills}>
                      {parts.map((p, idx) => {
                        const inst = allInstruments.find((i) => i.id === p.instrumentId);
                        return (
                          <span key={idx} className={styles.partPill}>
                            <span className={styles.partPillName}>{p.partName || "パート"}</span>
                            {inst && (
                              <span className={styles.partPillInst}>({inst.name})</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            "パート構成未設定"
          )}
        </DisplayField>

        {/* ソロ (Solo) */}
        <DisplayField label="ソロ (Solo)">
          {solos.length > 0 ? (
            <div className={styles.soloFeatureBadgeList}>
              {solos.map((s, idx) => {
                const inst = allInstruments.find((i) => i.id === s.instrumentId);
                return (
                  <span key={idx} className={styles.soloBadge}>
                    <i className="fa-solid fa-microphone-lines" />
                    <span>
                      {s.partName}
                      {inst ? ` (${inst.name})` : ""}
                    </span>
                  </span>
                );
              })}
            </div>
          ) : (
            "ソロ指定なし"
          )}
        </DisplayField>

        {/* フィーチャー (Feat) */}
        <DisplayField label="フィーチャー (Feat)">
          {features.length > 0 ? (
            <div className={styles.soloFeatureBadgeList}>
              {features.map((f, idx) => {
                const inst = allInstruments.find((i) => i.id === f.instrumentId);
                return (
                  <span key={idx} className={styles.featureBadge}>
                    <i className="fa-solid fa-star" />
                    <span>
                      {f.partName}
                      {inst ? ` (${inst.name})` : ""}
                    </span>
                  </span>
                );
              })}
            </div>
          ) : (
            "フィーチャー指定なし"
          )}
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