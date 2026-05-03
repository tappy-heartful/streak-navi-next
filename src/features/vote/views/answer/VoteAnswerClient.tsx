"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Vote } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { AnswerEditLayout } from "@/src/components/Layout/AnswerEditLayout";
import { buildYouTubeHtml, showDialog, showSpinner, hideSpinner, writeLog } from "@/src/lib/functions";
import { submitVoteAnswer } from "@/src/features/vote/api/vote-client-service";
import { db } from "@/src/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Modal } from "@/src/components/Modal";

type Props = {
  vote: Vote;
  voteId: string;
};

export function VoteAnswerClient({ vote, voteId }: Props) {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.id;

  const [answers, setAnswers] = useState<Record<string, string | string[] | null>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const fetchExisting = async () => {
      const snap = await getDoc(doc(db, "voteAnswers", `${voteId}_${uid}`));
      if (snap.exists()) {
        const data = snap.data();
        const loadedAnswers = data.answers || {};
        
        // 投票形式が変更されていた場合の型調整
        vote.items.forEach(item => {
          const ans = loadedAnswers[item.name];
          if (vote.type === "borda" && typeof ans === "string") {
            loadedAnswers[item.name] = [ans];
          } else if (vote.type !== "borda" && Array.isArray(ans)) {
            loadedAnswers[item.name] = ans[0] || null;
          }
        });
        
        setAnswers(loadedAnswers);
        setIsEdit(true);
      }
      setIsLoading(false);
    };
    fetchExisting();
  }, [uid, voteId]);

  const handleChange = (itemName: string, choiceName: string) => {
    setAnswers(prev => ({ ...prev, [itemName]: choiceName }));
  };
  
  const handleBordaClick = (itemName: string, choiceName: string, maxRanks: number) => {
    const current = (answers[itemName] as string[]) || [];
    if (current.includes(choiceName)) return; // Already selected
    if (current.length >= maxRanks) return; // Full
    
    setAnswers(prev => ({ ...prev, [itemName]: [...current, choiceName] }));
  };

  const handleClearBorda = (itemName: string) => {
    setAnswers(prev => ({ ...prev, [itemName]: [] }));
  };

  const handleYoutubeModal = (url: string, title: string) => {
    const html = buildYouTubeHtml(url, true, false);
    setModalTitle(title);
    setModalContent(<div dangerouslySetInnerHTML={{ __html: html }} />);
    setModalOpen(true);
  };

  const handleSave = async () => {
    // validation
    const errorItems: string[] = [];
    vote.items.forEach(item => {
      const ans = answers[item.name];
      if (vote.type === "borda") {
        if (!ans || (ans as string[]).length === 0) errorItems.push(item.name);
      } else {
        if (!ans) errorItems.push(item.name);
      }
    });

    if (errorItems.length > 0) {
      await showDialog("すべての質問に回答してください。", true);
      return;
    }

    const confirmed = await showDialog(`回答を${isEdit ? "修正" : "登録"}しますか？`);
    if (!confirmed) return;

    if (!uid) return;

    showSpinner();
    try {
      await submitVoteAnswer(voteId, uid, answers);
      hideSpinner();
      await writeLog({ dataId: voteId, action: `曲投票回答${isEdit ? "修正" : "登録"}` });
      await showDialog(`回答を${isEdit ? "修正" : "登録"}しました`, true);
      router.refresh();
      router.push(`/vote/confirm?voteId=${voteId}`);
    } catch (e) {
      hideSpinner();
      await writeLog({ dataId: voteId, action: `曲投票回答${isEdit ? "修正" : "登録"}`, status: "error", errorDetail: { message: (e as Error).message } });
      await showDialog("保存に失敗しました", true);
    }
  };

  // リンク表示用ヘルパー
  const renderLinkIcon = (url: string | undefined, title: string) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
        return (
          <button type="button" onClick={() => handleYoutubeModal(url, title)} style={{ background: "none", border: "none", color: "red", fontSize: "1.2rem", cursor: "pointer", marginLeft: "8px" }}>
            <i className="fa-brands fa-youtube" />
          </button>
        );
      }
    } catch (e) {}

    return (
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#1a73e8", fontSize: "1.1rem", marginLeft: "8px" }}>
        <i className="fas fa-arrow-up-right-from-square" />
      </a>
    );
  };

  return (
    <BaseLayout>
      <AnswerEditLayout
        featureName="曲投票"
        icon="fas fa-vote-yea"
        basePath="/vote"
        featureIdKey="voteId"
        dataId={voteId}
        mode={isEdit ? "edit" : "new"}
        onSave={handleSave}
        isLoading={isLoading}
      >
        <div style={{ marginBottom: "24px" }}>
          <h2>{vote.name}</h2>
          <p style={{ whiteSpace: "pre-wrap", color: "#555" }}>
            {vote.descriptionLink ? (
              <a href={vote.descriptionLink} target="_blank" rel="noopener noreferrer" style={{ color: "#1a73e8", textDecoration: "underline" }}>
                {vote.description}
              </a>
            ) : vote.description}
          </p>
        </div>

        <div>
          {vote.items.map((item, i) => {
            const isBorda = vote.type === "borda";
            const bordaAns = isBorda ? (answers[item.name] as string[]) || [] : [];
            const maxRanks = vote.bordaConfig?.maxRanks || 3;

            return (
              <div key={item.name} className="vote-item" style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div className="vote-item-title" style={{ margin: 0 }}>曲投票項目: {item.name}</div>
                  {isBorda && (
                    <button type="button" onClick={() => handleClearBorda(item.name)} style={{
                      fontSize: "0.8rem", padding: "4px 10px", backgroundColor: "#f0f0f0", border: "1px solid #ccc", borderRadius: "4px", color: "#666"
                    }}>
                      選びなおす
                    </button>
                  )}
                </div>
                {isBorda && (
                  <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "10px" }}>
                    タップした順に順位が付きます（最大{maxRanks}位まで / {(() => {
                      const pts = [];
                      const scoring = vote.bordaConfig?.scoring || "linear";
                      for (let i = 0; i < maxRanks; i++) {
                        let p = 0;
                        if (scoring === "linear") p = maxRanks - i;
                        else {
                          const weights = [10, 6, 4, 3, 2, 1];
                          if (maxRanks === 3) p = [5, 3, 1][i];
                          else p = weights[i] || 1;
                        }
                        pts.push(`${i + 1}位:${p}pt`);
                      }
                      return pts.join(", ");
                    })()}）
                  </p>
                )}
                <div className="vote-choices">
                  {item.choices.map((choice, j) => {
                    const id = `choice-${i}-${j}`;
                    const rankIdx = isBorda ? bordaAns.indexOf(choice.name) : -1;
                    const isChecked = isBorda ? rankIdx !== -1 : answers[item.name] === choice.name;

                    return (
                      <div key={choice.name} className="vote-choice-wrapper" style={{
                        padding: 0,
                        marginBottom: "10px",
                        backgroundColor: isChecked ? "#fffef0" : "#fff",
                        borderRadius: "12px",
                        border: `1px solid ${isChecked ? "#4caf50" : "#e9edf2"}`,
                        boxShadow: isChecked ? "0 2px 8px rgba(76, 175, 80, 0.1)" : "0 2px 4px rgba(0,0,0,0.02)",
                        overflow: "hidden"
                      }}>
                        <label
                          className={`vote-choice-label${isChecked ? " selected" : ""}`}
                          htmlFor={id}
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            padding: "12px 16px", 
                            cursor: "pointer", 
                            gap: "12px",
                            border: "none",
                            background: "none",
                            margin: 0,
                            width: "100%",
                            boxSizing: "border-box"
                          }}
                          onClick={(e) => {
                            if (isBorda) {
                              e.preventDefault();
                              handleBordaClick(item.name, choice.name, maxRanks);
                            }
                          }}
                        >
                          {/* Status Column */}
                          <div style={{ width: "28px", flexShrink: 0, display: "flex", justifyContent: "center" }}>
                            {isBorda ? (
                              isChecked ? (
                                <span style={{
                                  backgroundColor: "#4caf50",
                                  color: "#fff",
                                  width: "24px",
                                  height: "24px",
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.85rem",
                                  fontWeight: "bold",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                }}>
                                  {rankIdx + 1}
                                </span>
                              ) : (
                                <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: "2px solid #cbd5e0" }} />
                              )
                            ) : (
                              <input
                                type="radio"
                                name={item.name}
                                id={id}
                                value={choice.name}
                                checked={isChecked}
                                onChange={() => handleChange(item.name, choice.name)}
                                style={{ width: "20px", height: "20px", cursor: "pointer", margin: 0 }}
                              />
                            )}
                          </div>

                          {/* Info Column */}
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                            <div style={{ fontWeight: "700", fontSize: "1rem", color: isChecked ? "#1a531b" : "#333", lineHeight: "1.4" }}>
                              {choice.name}
                            </div>
                            {choice.difficulty !== undefined && choice.difficulty > 0 && (
                              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.65rem", color: "#718096", fontWeight: "600" }}>
                                <i className="fas fa-gauge-high" style={{ fontSize: "0.6rem" }}></i> Lv.{choice.difficulty}
                              </div>
                            )}
                          </div>

                          {/* Link Icon Column */}
                          <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
                            {renderLinkIcon(choice.link, choice.name)}
                          </div>
                        </label>
                      </div>
                    );
                  })}
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
      </AnswerEditLayout>
    </BaseLayout>
  );
}
