"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { AnswerConfirmLayout } from "@/src/components/Layout/AnswerConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Vote, VoteAnswer } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { isInTerm, buildYouTubeHtml, extractYouTubeId, showDialog, showSpinner, hideSpinner, globalLineDefaultImage, writeLog } from "@/src/lib/functions";
import { deleteVoteWithAnswers, deleteMyVoteAnswer } from "@/src/features/vote/api/vote-client-service";
import { Modal } from "@/src/components/Modal";

type Props = {
  voteData: Vote;
  voteId: string;
  voteAnswers: VoteAnswer[];
  usersMap: Record<string, { name: string; pictureUrl: string }>;
};

export function VoteConfirmClient({ voteData, voteId, voteAnswers, usersMap }: Props) {
  const router = useRouter();
  const { userData, isAdmin } = useAuth();
  const uid = userData?.id;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  const allVideoIds = React.useMemo(() => {
    const ids = new Set<string>();
    (voteData.items || []).forEach(item => {
      if (item.link) {
        const id = extractYouTubeId(item.link);
        if (id && id.length === 11) ids.add(id);
      }
      item.choices.forEach(c => {
        if (c.link) {
          const id = extractYouTubeId(c.link);
          if (id && id.length === 11) ids.add(id);
        }
      });
    });
    return Array.from(ids);
  }, [voteData.items]);

  const playlistUrl = allVideoIds.length > 0
    ? allVideoIds.length === 1
      ? `https://www.youtube.com/watch?v=${allVideoIds[0]}`
      : `https://www.youtube.com/watch_videos?video_ids=${allVideoIds.join(",")}`
    : "";

  const isActive = isInTerm(voteData.acceptStartDate, voteData.acceptEndDate);
  const myAnswer = voteAnswers.find(a => a.uid === uid)?.answers || {};
  const hasAnswered = Object.keys(myAnswer).length > 0;
  const participantCount = voteAnswers.length;

  const statusClass = !isActive ? "closed" : hasAnswered ? "answered" : "pending";
  const statusText = !isActive ? "期間外" : hasAnswered ? "回答済" : "未回答";

  const handleAdminDelete = async () => {
    const confirmed = await showDialog("曲投票と全員の回答を削除しますか？\nこの操作は元に戻せません");
    if (!confirmed) return;
    const confirmedAgain = await showDialog("本当に削除しますか？");
    if (!confirmedAgain) return;

    showSpinner();
    try {
      await deleteVoteWithAnswers(voteId);
      hideSpinner();
      await writeLog({ dataId: voteId, action: "曲投票削除" });
      await showDialog("削除しました", true);
      router.refresh();
      showSpinner();
      router.push("/vote");
    } catch (e) {
      hideSpinner();
      await writeLog({ dataId: voteId, action: "曲投票削除", status: "error", errorDetail: { message: (e as Error).message } });
      await showDialog("削除に失敗しました", true);
    }
  };

  const handleDeleteMyAnswer = async () => {
    if (!uid) return;
    const confirmed = await showDialog("自分の回答を取り消しますか？");
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteMyVoteAnswer(voteId, uid);
      hideSpinner();
      await writeLog({ dataId: voteId, action: "曲投票回答取消" });
      await showDialog("回答を取り消しました", true);
      router.refresh();
    } catch (e) {
      hideSpinner();
      await writeLog({ dataId: voteId, action: "曲投票回答取消", status: "error", errorDetail: { message: (e as Error).message } });
      await showDialog("削除に失敗しました", true);
    }
  };

  const handleVoterModal = (itemTitle: string, choiceName: string) => {
    const voterUids = voteAnswers
      .filter(ans => ans.answers[itemTitle] === choiceName)
      .map(ans => ans.uid);

    const votersContent = voterUids.map(vid => {
      const user = usersMap[vid];
      const name = user ? user.name : "退会済みユーザ";
      const pic = user?.pictureUrl || globalLineDefaultImage;
      return (
        <div key={vid} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
          <img src={pic} alt={name} style={{ width: "32px", height: "32px", borderRadius: "50%", marginRight: "8px" }}
            onError={(e) => { e.currentTarget.src = globalLineDefaultImage; }} />
          <span>{name}</span>
        </div>
      );
    });

    setModalTitle(`${choiceName} に曲投票した人`);
    setModalContent(<div>{votersContent}</div>);
    setModalOpen(true);
  };

  const handleYoutubeModal = (url: string, title: string) => {
    setModalTitle(title);
    setModalContent(<div dangerouslySetInnerHTML={{ __html: buildYouTubeHtml(url, true, false) }} />);
    setModalOpen(true);
  };

  // リンク表示ヘルパー（YouTube はモーダル、その他は新規タブ）
  const renderLink = (linkUrl: string | undefined, text: string) => {
    if (!linkUrl) return <>{text}</>;
    try {
      const u = new URL(linkUrl);
      if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
        return (
          <a href="#" onClick={(e) => { e.preventDefault(); handleYoutubeModal(linkUrl, text); }}>
            {text}
          </a>
        );
      }
    } catch { }
    return <a href={linkUrl} target="_blank" rel="noopener noreferrer">{text}</a>;
  };

  const answerMenuSlot = (
    <>
      <button
        type="button"
        className="save-button"
        onClick={() => { showSpinner(); router.push(`/vote/answer?voteId=${voteId}`); }}
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

  // 「編集」「コピー」「削除」は AnswerConfirmLayout の DetailActionButtons が担当
  // adminExtraSlot には投票固有の追加操作のみ
  const adminExtraSlot = (
    <button
      type="button"
      className="edit-button"
      onClick={() => { showSpinner(); router.push(`/vote/link-edit?voteId=${voteId}`); }}
    >
      曲投票リンク設定
    </button>
  );

  const myPic = usersMap[uid || ""]?.pictureUrl || globalLineDefaultImage;
  // isAdmin は結果・票数常時表示、hideVotes 時は一般には非表示
  const canViewResults = isAdmin || !voteData.hideVotes;
  // isAnonymous 時は投票者一覧非表示
  const showVoterLink = canViewResults && !voteData.isAnonymous;

  return (
    <BaseLayout>
      <AnswerConfirmLayout
        name="曲投票"
        icon="fas fa-vote-yea"
        basePath="/vote"
        dataId={voteId}
        featureIdKey="voteId"
        answerStatus={statusClass}
        answerStatusText={statusText}
        isActive={isActive}
        onDelete={handleAdminDelete}
        answerMenuSlot={answerMenuSlot}
        adminExtraSlot={adminExtraSlot}
      >
        <DisplayField label="タイトル">{voteData.name}</DisplayField>
        <DisplayField label="説明" preWrap>
          {renderLink(voteData.descriptionLink, voteData.description)}
        </DisplayField>
        <DisplayField label="受付期間">
          {voteData.acceptStartDate} ～ {voteData.acceptEndDate}
        </DisplayField>
        <DisplayField label="作成者">{voteData.createdBy}</DisplayField>
        <DisplayField label="回答数">
          {isActive ? "受付中" : "期間外"}（{participantCount}人が回答済）
        </DisplayField>
        <DisplayField label="曲投票形式">
          {voteData.type === "borda" ? (
            <span style={{ color: "#E91E63", fontWeight: "bold" }}>
              <i className="fas fa-list-ol" style={{ marginRight: "6px" }} />
              ボルダルール（最大{voteData.bordaConfig?.maxRanks}位 / {voteData.bordaConfig?.scoring === "weighted" ? "傾斜" : "線形"}配点: {(() => {
                const max = voteData.bordaConfig?.maxRanks || 3;
                const scoring = voteData.bordaConfig?.scoring || "linear";
                const pts = [];
                for (let i = 0; i < max; i++) {
                  let p = 0;
                  if (scoring === "linear") p = max - i;
                  else {
                    const weights = [10, 6, 4, 3, 2, 1];
                    if (max === 3) p = [5, 3, 1][i];
                    else p = weights[i] || 1;
                  }
                  pts.push(`${i + 1}位:${p}pt`);
                }
                return pts.join(", ");
              })()}）
            </span>
          ) : (
            <span>
              <i className="fas fa-check-circle" style={{ marginRight: "6px", color: "#4CAF50" }} />
              シンプル（1人1票）
            </span>
          )}
        </DisplayField>

        {isAdmin && voteData.hideVotes && (
          <p className="vote-msg">※「票数を非公開」のため曲投票結果は一般メンバーには見えていません</p>
        )}

        {/* 投票結果 */}
        <div id="vote-items-container" style={{ marginTop: "3rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <h3 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#333", margin: 0, display: "flex", alignItems: "center", gap: "10px", borderLeft: "none", paddingLeft: 0 }}>
                <i className="fas fa-poll" style={{ color: "#4CAF50" }}></i> 曲投票項目と結果
              </h3>
            </div>
            {playlistUrl && (
              <a href={playlistUrl} target="_blank" rel="noreferrer" className="list-badge-button" style={{ backgroundColor: "#ff0000", marginLeft: "auto" }}>
                <i className="fa-brands fa-youtube"></i> 全曲プレイリスト
              </a>
            )}
          </div>
          <p style={{
            fontSize: "0.85rem",
            color: "#666",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#f8f9fa",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #e9ecef"
          }}>
            <i className="fas fa-info-circle" style={{ color: "#2196F3" }}></i>
            <span><strong>難易度 (Lv) について:</strong> 1（易）〜 10（難）の10段階で評価されています。</span>
          </p>

          {(voteData.items || []).map((item, idx) => {
            const isBorda = voteData.type === "borda";
            const maxRanks = voteData.bordaConfig?.maxRanks || 3;
            const scoring = voteData.bordaConfig?.scoring || "linear";

            const results: Record<string, number> = {};
            item.choices.forEach(c => { results[c.name] = 0; });

            voteAnswers.forEach(ans => {
              const answer = ans.answers[item.name];
              if (isBorda && Array.isArray(answer)) {
                answer.forEach((choiceName, rankIdx) => {
                  if (results[choiceName] !== undefined) {
                    let pts = 0;
                    if (scoring === "linear") {
                      pts = maxRanks - rankIdx;
                    } else {
                      // Weighted: 1st gets 5, 2nd gets 3, 3rd gets 1 (if maxRanks=3)
                      // Generalized weighted: 1st=10, 2nd=6, 3rd=4, 4th=2, 5th=1...
                      const weights = [10, 6, 4, 3, 2, 1];
                      if (maxRanks === 3) pts = [5, 3, 1][rankIdx];
                      else pts = weights[rankIdx] || 1;
                    }
                    results[choiceName] += pts;
                  }
                });
              } else if (!isBorda && typeof answer === "string") {
                if (answer && results[answer] !== undefined) results[answer]++;
              }
            });
            const maxVal = Math.max(...Object.values(results), 1);

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
              <div key={item.name} className="vote-item" style={{
                marginBottom: "2.5rem",
                backgroundColor: "#fff",
                borderRadius: "16px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                border: `1px solid ${color.border}22`,
                overflow: "hidden",
                padding: 0
              }}>
                <div className="vote-item-title" style={{
                  padding: "16px 24px",
                  backgroundColor: color.bg,
                  borderBottom: `2px solid ${color.border}`,
                  fontWeight: "900",
                  fontSize: "1.2rem",
                  color: color.text,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  lineHeight: "1.3",
                  margin: 0
                }}>
                  <i className="fas fa-question-circle"></i> {renderLink(item.link, item.name)}
                </div>
                <div className="vote-results" style={{ padding: "20px", marginTop: 0, position: "relative" }}>
                  {(() => {
                    const itemChoicesResults = item.choices.map(c => results[c.name] || 0);
                    const itemMaxVal = Math.max(...itemChoicesResults, 1);

                    return item.choices.map(choice => {
                      const val = results[choice.name] || 0;
                      const percent = canViewResults ? (val / itemMaxVal) * 100 : 0;
                      const isMyChoice = isBorda
                        ? ((myAnswer[item.name] as string[]) || []).includes(choice.name)
                        : myAnswer[item.name] === choice.name;
                      const myRank = isBorda ? ((myAnswer[item.name] as string[]) || []).indexOf(choice.name) : -1;
                      const canVoterLink = !isBorda && showVoterLink && val > 0;

                      return (
                        <div key={choice.name} className={`result-bar${isMyChoice ? " my-choice" : ""}`} style={{
                          padding: "16px 20px",
                          marginBottom: "12px",
                          backgroundColor: "#fff",
                          borderRadius: "16px",
                          border: "1px solid #eef2f6",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          position: "relative",
                          overflow: "hidden"
                        }}>
                          {/* Background Gauge */}
                          {canViewResults && (
                            <div style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              bottom: 0,
                              width: `${percent}%`,
                              backgroundColor: "rgba(76, 175, 80, 0.1)",
                              zIndex: 0,
                              transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)"
                            }} />
                          )}

                          {/* Column 1: Vote Status */}
                          <div style={{ width: "45px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", zIndex: 1 }}>
                            {isMyChoice ? (
                              <>
                                <img
                                  src={myPic}
                                  alt="あなた"
                                  style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                                  onError={(e) => { e.currentTarget.src = globalLineDefaultImage; }}
                                />
                                {isBorda && myRank !== -1 && (
                                  <span style={{
                                    fontSize: "0.6rem",
                                    background: (() => {
                                      if (myRank === 0) return "#FFD700";
                                      if (myRank === 1) return "#C0C0C0";
                                      if (myRank === 2) return "#CD7F32";
                                      return "#4A90E2";
                                    })(),
                                    color: "#fff",
                                    padding: "1px 6px",
                                    borderRadius: "10px",
                                    fontWeight: "900",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                    whiteSpace: "nowrap"
                                  }}>
                                    {myRank + 1}位
                                  </span>
                                )}
                              </>
                            ) : (
                              <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#f8f9fa", border: "1px solid #eee" }} />
                            )}
                          </div>

                          {/* Column 2: Name and Difficulty */}
                          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px", zIndex: 1 }}>
                            <div style={{
                              fontWeight: "800",
                              color: isMyChoice ? "#1a1a1a" : "#333",
                              fontSize: "1.05rem",
                              lineHeight: "1.4"
                            }}>
                              {renderLink(choice.link, choice.name)}
                            </div>
                            {choice.difficulty !== undefined && choice.difficulty > 0 && (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                                <div style={{
                                  fontSize: "0.7rem",
                                  color: "#718096",
                                  fontWeight: "700",
                                  backgroundColor: "#edf2f7",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  flexShrink: 0
                                }}>
                                  <i className="fas fa-gauge-high" style={{ fontSize: "0.6rem" }}></i> Lv.{choice.difficulty}
                                </div>
                                <div style={{ height: "5px", width: "60px", backgroundColor: "#edf2f7", borderRadius: "3px", overflow: "hidden", flexShrink: 0 }}>
                                  <div style={{
                                    width: `${choice.difficulty * 10}%`,
                                    backgroundColor: choice.difficulty >= 8 ? "#f56565" : choice.difficulty >= 5 ? "#ed8936" : "#48bb78",
                                    height: "100%",
                                    borderRadius: "3px"
                                  }} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Column 3: Result */}
                          {canViewResults && (
                            <div style={{
                              textAlign: "right",
                              minWidth: "75px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: "2px",
                              zIndex: 1
                            }}>
                              <div style={{
                                fontSize: "1.4rem",
                                fontWeight: "900",
                                color: isMyChoice ? "#2d3748" : "#4a5568",
                                lineHeight: "1"
                              }}>
                                {val}
                                <span style={{ fontSize: "0.75rem", fontWeight: "700", marginLeft: "2px", color: "#718096" }}>
                                  {isBorda ? "Pt" : "票"}
                                </span>
                              </div>
                              {canVoterLink && (
                                <a href="#" onClick={(e) => { e.preventDefault(); handleVoterModal(item.name, choice.name); }} style={{
                                  fontSize: "0.65rem", fontWeight: "700", color: "#3182ce", textDecoration: "underline"
                                }}>
                                  内訳を見る
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                  {(() => {
                    const itemVideoIds = new Set<string>();
                    if (item.link) {
                      const id = extractYouTubeId(item.link);
                      if (id && id.length === 11) itemVideoIds.add(id);
                    }
                    item.choices.forEach(c => {
                      if (c.link) {
                        const id = extractYouTubeId(c.link);
                        if (id && id.length === 11) itemVideoIds.add(id);
                      }
                    });
                    const itemPlaylistUrl = itemVideoIds.size > 0
                      ? itemVideoIds.size === 1
                        ? `https://www.youtube.com/watch?v=${Array.from(itemVideoIds)[0]}`
                        : `https://www.youtube.com/watch_videos?video_ids=${Array.from(itemVideoIds).join(",")}`
                      : "";

                    return itemPlaylistUrl && (
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                        <a
                          href={itemPlaylistUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="list-badge-button"
                          style={{
                            backgroundColor: "#ff0000",
                            margin: 0
                          }}
                        >
                          <i className="fa-brands fa-youtube"></i> このジャンルのプレイリスト
                        </a>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {modalOpen && (
          <Modal title={modalTitle} onClose={() => setModalOpen(false)}>
            {modalContent}
          </Modal>
        )}
      </AnswerConfirmLayout>
    </BaseLayout>
  );
}
