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
        <div id="call-items" style={{ marginTop: "1.5rem" }}>
          {(callData.items || []).map(genre => {
            const genreAnswers = callAnswers.flatMap(ans => {
              const songs = ans.answers?.[genre] || [];
              if (songs.length === 0) return [];
              return [{ uid: ans.uid, songs }];
            });

            return (
              <div key={genre} className="genre-block" style={{ marginBottom: "1.5rem" }}>
                <div className="genre-title" style={{ fontWeight: "bold", marginBottom: "8px" }}>
                  🎵 {genre}
                </div>
                <div className="genre-answers">
                  {genreAnswers.length > 0 ? genreAnswers.map(({ uid: ansUid, songs }, i) => (
                    <div key={i}>
                      {!callData.isAnonymous && (
                        <div className="answer-user" style={{ color: "#666", fontSize: "0.9em" }}>
                          回答者: {usersMap[ansUid] || "(不明)"}
                        </div>
                      )}
                      {(songs as CallAnswerSong[]).map((song, j) => {
                        const scoreName = song.scorestatus ? scoreStatusMap[song.scorestatus] : "";
                        const isYouTube = song.url && (song.url.includes("youtube.com/watch") || song.url.includes("youtu.be"));

                        return (
                          <div key={j} className="song-item" style={{ marginBottom: "12px", paddingLeft: "1rem", borderLeft: "2px solid #ddd" }}>
                            <div><strong>{song.title}</strong></div>
                            {song.url && (
                              <div>
                                参考音源:{" "}
                                {isYouTube ? (
                                  <div
                                    className="youtube-display-area"
                                    dangerouslySetInnerHTML={{ __html: buildYouTubeHtml(song.url, true, false) }}
                                  />
                                ) : (
                                  <a href={song.url} target="_blank" rel="noopener noreferrer">
                                    リンクを開く <i className="fas fa-arrow-up-right-from-square"></i>
                                  </a>
                                )}
                              </div>
                            )}
                            {scoreName && <div>譜面: {scoreName}</div>}
                            {song.purchase && (
                              <div>
                                購入先:{" "}
                                <a href={song.purchase} target="_blank" rel="noopener noreferrer">
                                  リンクを開く <i className="fas fa-arrow-up-right-from-square"></i>
                                </a>
                              </div>
                            )}
                            {song.note && <div>備考: {song.note}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )) : (
                    <div className="no-answer" style={{ color: "#aaa" }}>（回答なし）</div>
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
