"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog } from "@/src/components/CommonDialog";
import { archiveAndDeleteDoc, buildYouTubeHtml } from "@/src/lib/functions";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { useConfirmPageBreadcrumbs } from "@/src/hooks/useConfirmPageBreadcrumbs";
import { Genre, Score } from "@/src/lib/firestore/types";

type Props = {
  scoreData: Score;
  allGenres: Genre[];
  scoreId: string;
};

export function ScoreConfirmClient({ scoreData, allGenres, scoreId }: Props) {
  const router = useRouter();

  // 削除処理
  const handleDelete = async () => {
    const confirmed = await showDialog("この譜面を削除しますか？\nこの操作は元に戻せません。");
    if (!confirmed) return;

    try {
      await archiveAndDeleteDoc("scores", scoreId);
      await showDialog("削除しました", true);
      router.push("/score");
    } catch (e) {
      console.error(e);
      await showDialog("削除に失敗しました", true);
    }
  };

  // ジャンル名の解決
  const genreNames = scoreData.genres
    ?.map((gid: string) => allGenres.find((g) => g.id === gid)?.name)
    .filter(Boolean)
    .join("、");

  return (
    <BaseLayout>
      <ConfirmLayout
        name="譜面"
        backHref="/score"
        onEdit={() => router.push(`/score/edit?mode=edit&scoreId=${scoreId}`)}
        onCopy={() => router.push(`/score/edit?mode=copy&scoreId=${scoreId}`)}
        onDelete={handleDelete}
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

        <div className="form-group">
          <label className="label-title">参考音源</label>
          <div id="reference-track">
            {scoreData.referenceTrack ? (
              <div 
                className="youtube-display-area"
                dangerouslySetInnerHTML={{ 
                  __html: buildYouTubeHtml(scoreData.referenceTrack) 
                }} 
              />
            ) : "未設定"}
          </div>
        </div>

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