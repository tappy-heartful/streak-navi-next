"use client";

import { buildYouTubeHtml } from "@/src/lib/functions";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Genre, Score } from "@/src/lib/firestore/types";

type Props = {
  scoreData: Score;
  allGenres: Genre[];
  scoreId: string;
};

export function ScoreConfirmClient({ scoreData, allGenres, scoreId }: Props) {
  // ジャンル名の解決ロジック
  const genreNames = scoreData.genres
    ?.map((gid) => allGenres.find((g) => g.id === gid)?.name)
    .filter(Boolean)
    .join("、");

  return (
    <BaseLayout>
      <ConfirmLayout
        name="譜面"
        basePath="/score"
        dataId={scoreId}
        collectionName="scores"
      >
        <DisplayField label="タイトル">
          {scoreData.title}
        </DisplayField>

        <DisplayField label="譜面">
          {scoreData.scoreUrl && (
            <a href={scoreData.scoreUrl} target="_blank" rel="noopener noreferrer">
              譜面をみる <i className="fas fa-arrow-up-right-from-square"></i>
            </a>
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
    </BaseLayout>
  );
}