"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { AnswerConfirmLayout } from "@/src/components/Layout/AnswerConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Call, CallAnswer, CallAnswerSong } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { isInTerm, buildYouTubeHtml, showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import { deleteCallWithAnswers, deleteMyCallAnswer } from "@/src/features/call/api/call-client-service";

type Props = {
  callData: Call;
  callId: string;
  callAnswers: CallAnswer[];
  usersMap: Record<string, string>;
  scoreStatusMap: Record<string, string>;
};

export function CallConfirmClient({ callData, callId, callAnswers, usersMap, scoreStatusMap }: Props) {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.id;

  const isActive = isInTerm(callData.acceptStartDate, callData.acceptEndDate);
  const myAnswer = callAnswers.find(a => a.uid === uid);
  const hasAnswered = !!myAnswer && Object.keys(myAnswer.answers).length > 0;
  const participantCount = callAnswers.length;

  const statusClass = !isActive ? "closed" : hasAnswered ? "answered" : "pending";
  const statusText = !isActive ? "期間外" : hasAnswered ? "回答済" : "未回答";

  const handleAdminDelete = async () => {
    const confirmed = await showDialog("募集と全員の回答を削除しますか？\nこの操作は元に戻せません");
    if (!confirmed) return;
    const confirmedAgain = await showDialog("本当に削除しますか？");
    if (!confirmedAgain) return;

    showSpinner();
    try {
      await deleteCallWithAnswers(callId);
      hideSpinner();
      await showDialog("削除しました", true);
      router.push("/call");
    } catch {
      hideSpinner();
      await showDialog("削除に失敗しました", true);
    }
  };

  const handleDeleteMyAnswer = async () => {
    if (!uid) return;
    const confirmed = await showDialog("自分の回答を取り消しますか？");
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteMyCallAnswer(callId, uid);
      hideSpinner();
      await showDialog("回答を取り消しました", true);
      router.refresh();
    } catch {
      hideSpinner();
      await showDialog("削除に失敗しました", true);
    }
  };

  const answerMenuSlot = (
    <>
      <Link href={`/call/answer?callId=${callId}`} className="edit-button" style={{ textDecoration: "none", display: "inline-block" }}>
        {hasAnswered ? "回答を修正する" : "回答する"}
      </Link>
      {hasAnswered && (
        <button type="button" className="delete-button" onClick={handleDeleteMyAnswer}>
          回答を取り消す
        </button>
      )}
    </>
  );

  const adminExtraSlot = (
    <button
      type="button"
      className="edit-button"
      onClick={() => router.push(`/vote/edit?mode=createFromCall&callId=${callId}`)}
    >
      投票を作成する
    </button>
  );

  return (
    <BaseLayout>
      <AnswerConfirmLayout
        name="曲募集"
        basePath="/call"
        dataId={callId}
        featureIdKey="callId"
        answerStatus={statusClass}
        answerStatusText={statusText}
        isActive={isActive}
        onDelete={handleAdminDelete}
        answerMenuSlot={answerMenuSlot}
        adminExtraSlot={adminExtraSlot}
      >
        <DisplayField label="タイトル">{callData.title}</DisplayField>
        <DisplayField label="説明" preWrap>{callData.description}</DisplayField>
        <DisplayField label="受付期間">
          {callData.acceptStartDate} ～ {callData.acceptEndDate}
        </DisplayField>
        <DisplayField label="受付状況">
          {isActive ? "受付中" : "期間外"}（{participantCount}人が回答中）
        </DisplayField>
        <DisplayField label="作成者">{callData.createdBy}</DisplayField>

        {/* 募集ジャンルごとの回答 */}
        <div id="call-items" style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "1.2rem", borderBottom: "2px solid #4CAF50", paddingBottom: "8px", marginBottom: "16px" }}>
            <i className="fas fa-music"></i> 募集ジャンルと回答
          </h3>
          {(callData.items || []).map(genre => {
            const genreAnswers = callAnswers.flatMap(ans => {
              const songs = ans.answers?.[genre] || [];
              if (songs.length === 0) return [];
              return [{ uid: ans.uid, songs }];
            });

            return (
              <div key={genre} className="genre-block" style={{ marginBottom: "2rem", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                <div className="genre-title" style={{ fontWeight: "bold", padding: "12px 16px", backgroundColor: "#f4f4f4", borderBottom: "1px solid #ddd", fontSize: "1.1rem" }}>
                  🎵 {genre}
                </div>
                <div className="genre-answers" style={{ padding: "16px" }}>
                  {genreAnswers.length > 0 ? genreAnswers.map(({ uid: ansUid, songs }, i) => (
                    <div key={i} style={{ marginBottom: i < genreAnswers.length - 1 ? "24px" : "0", borderBottom: i < genreAnswers.length - 1 ? "1px dashed #ccc" : "none", paddingBottom: i < genreAnswers.length - 1 ? "16px" : "0" }}>
                      {!callData.isAnonymous && (
                        <div className="answer-user" style={{ color: "#4CAF50", fontSize: "0.95em", fontWeight: "bold", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                           <i className="fas fa-user-circle"></i> {usersMap[ansUid] || "(不明)"}
                        </div>
                      )}
                      {(songs as CallAnswerSong[]).map((song, j) => {
                        const scoreName = song.scorestatus ? scoreStatusMap[song.scorestatus] : "";
                        const youtubeHtml = song.url ? buildYouTubeHtml(song.url, true, false) : "";

                        return (
                          <div key={j} className="song-item" style={{ marginBottom: j < songs.length - 1 ? "12px" : "0", borderLeft: "3px solid #4CAF50", backgroundColor: "#fafafa", padding: "12px", borderRadius: "0 6px 6px 0" }}>
                            <div style={{ fontSize: "1.1em", marginBottom: "8px" }}><strong>{song.title}</strong></div>
                            {song.url && (
                              <div style={{ marginBottom: "6px" }}>
                                <span style={{ fontSize: "0.85em", color: "#666" }}>参考音源: </span>
                                {youtubeHtml ? (
                                  <div
                                    className="youtube-display-area"
                                    style={{ marginTop: "4px" }}
                                    dangerouslySetInnerHTML={{ __html: youtubeHtml }}
                                  />
                                ) : (
                                  <a href={song.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.9em", color: "#1a73e8" }}>
                                    リンクを開く <i className="fas fa-arrow-up-right-from-square"></i>
                                  </a>
                                )}
                              </div>
                            )}
                            {scoreName && <div style={{ marginBottom: "6px", fontSize: "0.9em" }}><span style={{ color: "#666" }}>譜面: </span>{scoreName}</div>}
                            {song.purchase && (
                              <div style={{ marginBottom: "6px", fontSize: "0.9em" }}>
                                <span style={{ color: "#666" }}>購入先: </span>
                                <a href={song.purchase} target="_blank" rel="noopener noreferrer" style={{ color: "#1a73e8" }}>
                                  リンクを開く <i className="fas fa-arrow-up-right-from-square"></i>
                                </a>
                              </div>
                            )}
                            {song.note && (
                              <div style={{ fontSize: "0.9em", marginTop: "8px", padding: "8px", backgroundColor: "#fff", border: "1px solid #eee", borderRadius: "4px", whiteSpace: "pre-wrap" }}>
                                <span style={{ color: "#666", display: "block", marginBottom: "2px", fontSize: "0.85em", fontWeight: "bold" }}>備考:</span>
                                {song.note}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )) : (
                    <div className="no-answer" style={{ color: "#aaa", textAlign: "center", padding: "16px 0" }}>このジャンルへの回答はまだありません</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </AnswerConfirmLayout>
    </BaseLayout>
  );
}
