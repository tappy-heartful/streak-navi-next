"use client";

import { useRouter } from "next/navigation";
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
  usersMap: Record<string, { displayName: string; pictureUrl?: string }>;
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
  const statusText = !isActive ? "終了" : hasAnswered ? "回答済" : "未回答";

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

      router.refresh();
      showSpinner();
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
      <button
        type="button"
        className="save-button"
        onClick={() => { showSpinner(); router.push(`/call/answer?callId=${callId}`); }}
      >
        {hasAnswered ? "回答を修正する" : "回答する"}
      </button>
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
      onClick={() => {
        showSpinner();
        router.push(`/vote/edit?mode=createFromCall&callId=${callId}`);
      }}
    >
      投票を作成する
    </button>
  );

  return (
    <BaseLayout>
      <AnswerConfirmLayout
        name="曲募集"
        icon="fa fa-music"
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
        <DisplayField label="1人あたり各ジャンル回答可能数">
          {callData.maxSongsPerGenre ? `${callData.maxSongsPerGenre}曲` : "無制限"}
        </DisplayField>
        <DisplayField label="作成者">{callData.createdBy}</DisplayField>

        {/* 募集ジャンルごとの回答 */}
        <div id="call-items" style={{ marginTop: "3rem" }}>
          <h3 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#333", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="fas fa-list-ul" style={{ color: "#4CAF50" }}></i> 募集ジャンルと回答
          </h3>
          {(callData.items || []).map((genre, idx) => {
            const genreAnswers = callAnswers.flatMap(ans => {
              const songs = ans.answers?.[genre] || [];
              if (songs.length === 0) return [];
              return [{ uid: ans.uid, songs }];
            });

            // ジャンルごとに色を変える
            const colors = [
              { bg: "#E8F5E9", border: "#4CAF50", text: "#2E7D32" }, // Green
              { bg: "#E3F2FD", border: "#2196F3", text: "#1565C0" }, // Blue
              { bg: "#FFF3E0", border: "#FF9800", text: "#E65100" }, // Orange
              { bg: "#F3E5F5", border: "#9C27B0", text: "#7B1FA2" }, // Purple
              { bg: "#FFEBEE", border: "#F44336", text: "#C62828" }, // Red
              { bg: "#E0F2F1", border: "#009688", text: "#00695C" }, // Teal
            ];
            const color = colors[idx % colors.length];

            return (
              <div key={genre} className="genre-card-new" style={{ 
                marginBottom: "2.5rem", 
                backgroundColor: "#fff", 
                borderRadius: "16px", 
                boxShadow: "0 10px 25px rgba(0,0,0,0.05)", 
                border: `1px solid ${color.border}22`,
                overflow: "hidden" 
              }}>
                <div className="genre-header" style={{ 
                  padding: "16px 24px", 
                  backgroundColor: color.bg, 
                  borderBottom: `2px solid ${color.border}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}>
                  <span style={{ 
                    fontWeight: "900", 
                    fontSize: "1.2rem", 
                    color: color.text,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    lineHeight: "1.3"
                  }}>
                    <i className="fas fa-music"></i> {genre}
                  </span>
                  <span style={{ 
                    fontSize: "0.85rem", 
                    color: color.text, 
                    fontWeight: "bold", 
                    opacity: 0.8,
                    marginLeft: "28px" // アイコン(16px) + gap(8px) + 余裕
                  }}>
                    {genreAnswers.length}人が回答中
                  </span>
                </div>
                <div className="genre-body" style={{ padding: "20px" }}>
                  {genreAnswers.length > 0 ? genreAnswers.map(({ uid: ansUid, songs }, i) => {
                    const user = usersMap[ansUid];
                    const displayName = user?.displayName || "(不明)";
                    const pictureUrl = user?.pictureUrl || "https://tappy-heartful.github.io/streak-images/navi/line-profile-unset.png";

                    return (
                    <div key={i} style={{ 
                      marginBottom: i < genreAnswers.length - 1 ? "24px" : "0", 
                      paddingBottom: i < genreAnswers.length - 1 ? "24px" : "0",
                      borderBottom: i < genreAnswers.length - 1 ? "1px solid #eee" : "none"
                    }}>
                      {!callData.isAnonymous && (
                        <div className="answer-user-header" style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "10px", 
                          marginBottom: "14px"
                        }}>
                          <img 
                            src={pictureUrl} 
                            alt={displayName} 
                            style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }} 
                          />
                          <span style={{ fontWeight: "700", color: "#333", fontSize: "1rem" }}>{displayName}</span>
                        </div>
                      )}
                      <div className="songs-list" style={{ display: "grid", gap: "12px", marginLeft: callData.isAnonymous ? "0" : "4px" }}>
                        {(songs as CallAnswerSong[]).map((song, j) => {
                          const scoreName = song.scorestatus ? scoreStatusMap[song.scorestatus] : "";
                          const youtubeHtml = song.url ? buildYouTubeHtml(song.url, true, false) : "";

                          return (
                            <div key={j} className="song-detail-card" style={{ 
                              padding: "16px", 
                              backgroundColor: "#f9f9f9", 
                              borderRadius: "12px",
                              borderLeft: `4px solid ${color.border}`,
                              position: "relative"
                            }}>
                              <div style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "10px", color: "#222" }}>
                                {song.title}
                              </div>
                              
                              {song.url && (
                                <div className="song-media" style={{ marginBottom: "12px" }}>
                                  {youtubeHtml ? (
                                    <div
                                      className="youtube-container"
                                      style={{ marginTop: "8px", borderRadius: "8px", overflow: "hidden", maxWidth: "100%" }}
                                      dangerouslySetInnerHTML={{ __html: youtubeHtml }}
                                    />
                                  ) : (
                                    <a href={song.url} target="_blank" rel="noopener noreferrer" style={{ 
                                      display: "inline-flex", 
                                      alignItems: "center", 
                                      gap: "6px",
                                      fontSize: "0.9rem", 
                                      color: "#1a73e8",
                                      fontWeight: "600",
                                      textDecoration: "none",
                                      backgroundColor: "#e8f0fe",
                                      padding: "6px 12px",
                                      borderRadius: "20px"
                                    }}>
                                      <i className="fas fa-play-circle"></i> 参考音源を聴く
                                    </a>
                                  )}
                                </div>
                              )}

                              <div className="song-meta-info" style={{ display: "flex", flexWrap: "wrap", gap: "15px", fontSize: "0.85rem" }}>
                                {scoreName && (
                                  <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#555" }}>
                                    <i className="fas fa-file-alt" style={{ color: color.border }}></i>
                                    <span style={{ fontWeight: "bold" }}>譜面:</span> {scoreName}
                                  </div>
                                )}
                                {song.purchase && (
                                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                    <i className="fas fa-shopping-cart" style={{ color: color.border }}></i>
                                    <span style={{ fontWeight: "bold", color: "#555" }}>購入先:</span>
                                    <a href={song.purchase} target="_blank" rel="noopener noreferrer" style={{ color: "#1a73e8", fontWeight: "600" }}>
                                      リンク <i className="fas fa-external-link-alt" style={{ fontSize: "0.7rem" }}></i>
                                    </a>
                                  </div>
                                )}
                              </div>

                              {song.note && (
                                <div style={{ 
                                  marginTop: "12px", 
                                  padding: "10px 14px", 
                                  backgroundColor: "#fff", 
                                  border: "1px solid #eee", 
                                  borderRadius: "8px", 
                                  fontSize: "0.9rem", 
                                  lineHeight: "1.5",
                                  color: "#444",
                                  whiteSpace: "pre-wrap"
                                }}>
                                  <div style={{ fontSize: "0.75rem", fontWeight: "900", color: "#999", textTransform: "uppercase", marginBottom: "4px" }}>Note</div>
                                  {song.note}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );}) : (
                    <div className="no-answer-empty" style={{ 
                      padding: "40px 0", 
                      textAlign: "center", 
                      color: "#aaa", 
                      fontSize: "0.95rem",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px"
                    }}>
                      <i className="fas fa-comment-slash" style={{ fontSize: "2rem", opacity: 0.3 }}></i>
                      このジャンルへの回答はまだありません
                    </div>
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
