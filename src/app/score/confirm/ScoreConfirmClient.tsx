"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog } from "@/src/components/CommonDialog";
import { archiveAndDeleteDoc, buildYouTubeHtml } from "@/src/lib/functions";

export default function ScoreConfirmClient({ scoreData, allGenres, scoreId }: any) {
  const router = useRouter();
  const { setBreadcrumbs } = useBreadcrumb();
  const { isAdmin } = useAuth();

  useEffect(() => {
    setBreadcrumbs([
      { title: "譜面一覧", href: "/score" },
      { title: "譜面確認" },
    ]);
  }, [setBreadcrumbs]);

  // 削除処理
  const handleDelete = async () => {
    const confirmed = await showDialog(
      "この譜面を削除しますか？\nこの操作は元に戻せません。"
    );
    if (!confirmed) return;

    try {
      await archiveAndDeleteDoc("scores", scoreId);
      await showDialog("削除しました", true);
      router.push("/score");
    } catch (e: any) {
      console.error(e);
      await showDialog("削除に失敗しました", true);
    }
  };

  return (
    <main>
      <div className="page-header">
        <h1>譜面確認</h1>
      </div>

      <div className="container">
        <div className="form-group">
          <label className="label-title">タイトル</label>
          <div className="label-value">{scoreData.title || "未設定"}</div>
        </div>

        <div className="form-group">
          <label className="label-title">譜面</label>
          <div className="label-value">
            {scoreData.scoreUrl ? (
              <a href={scoreData.scoreUrl} target="_blank" rel="noopener noreferrer">
                譜面をみる <i className="fas fa-arrow-up-right-from-square"></i>
              </a>
            ) : (
              "未設定"
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="label-title">参考音源</label>
          <div id="reference-track">
            {scoreData.referenceTrack ? (
              /* buildYouTubeHtml を使用してHTMLを埋め込む */
              <div 
                className="youtube-display-area"
                dangerouslySetInnerHTML={{ 
                  __html: buildYouTubeHtml(scoreData.referenceTrack) 
                }} 
              />
            ) : (
              "未設定"
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="label-title">ジャンル</label>
          <div className="label-value">
            {scoreData.genres && scoreData.genres.length > 0
              ? scoreData.genres
                  .map((gid: string) => allGenres.find((g: any) => g.id === gid)?.name)
                  .filter(Boolean)
                  .join("、")
              : "未設定"}
          </div>
        </div>

        <div className="form-group">
          <label className="label-title">略称(譜割用)</label>
          <div className="label-value">{scoreData.abbreviation || "未設定"}</div>
        </div>

        <div className="form-group">
          <label className="label-title">備考</label>
          <div className="label-value" style={{ whiteSpace: "pre-wrap" }}>
            {scoreData.note || "未設定"}
          </div>
        </div>

        <div className="form-group">
          <label className="label-title">ホームに表示</label>
          <div className="label-value">
            {scoreData.isDispTop ? "表示する" : "表示しない"}
          </div>
        </div>

        {/* 管理者メニュー */}
        {isAdmin("Score") && (
          <div className="confirm-buttons">
            <button
              className="edit-button"
              onClick={() => router.push(`/score/edit?mode=edit&scoreId=${scoreId}`)}
            >
              編集
            </button>
            <button
              className="copy-button"
              onClick={() => router.push(`/score/edit?mode=copy&scoreId=${scoreId}`)}
            >
              コピー
            </button>
            <button className="delete-button" onClick={handleDelete}>
              削除
            </button>
          </div>
        )}
      </div>

      <div className="page-footer">
        <Link prefetch={true} href="/score" className="back-link">
          ← 譜面一覧に戻る
        </Link>
      </div>
    </main>
  );
}