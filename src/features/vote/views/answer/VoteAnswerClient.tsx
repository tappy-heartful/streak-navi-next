"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Vote } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { buildYouTubeHtml, showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import { submitVoteAnswer } from "@/src/features/vote/api/vote-client-service";
import { db } from "@/src/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Modal } from "@/src/components/Modal";
import { FormButtons } from "@/src/components/Form/FormButtons";
import { FormFooter } from "@/src/components/Form/FormFooter";

type Props = {
  vote: Vote;
  voteId: string;
};

export function VoteAnswerClient({ vote, voteId }: Props) {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.id;
  const { setBreadcrumbs } = useBreadcrumb();

  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      { title: "投票一覧", href: "/vote" },
      { title: "投票確認", href: `/vote/confirm?voteId=${voteId}` },
      { title: "回答登録/修正", href: "" }
    ]);
  }, [setBreadcrumbs, voteId]);

  useEffect(() => {
    if (!uid) return;
    const fetchExisting = async () => {
      const snap = await getDoc(doc(db, "voteAnswers", `${voteId}_${uid}`));
      if (snap.exists()) {
        const data = snap.data();
        setAnswers(data.answers || {});
        setIsEdit(true);
      }
    };
    fetchExisting();
  }, [uid, voteId]);

  const handleChange = (itemName: string, choiceName: string) => {
    setAnswers(prev => ({ ...prev, [itemName]: choiceName }));
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
      if (!answers[item.name]) errorItems.push(item.name);
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
      await showDialog(`回答を${isEdit ? "修正" : "登録"}しました`, true);
      router.push(`/vote/confirm?voteId=${voteId}`);
    } catch {
      hideSpinner();
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
      <div className="page-header">
        <h1>{isEdit ? "回答修正" : "回答登録"}</h1>
      </div>
      <div className="container">
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
          {vote.items.map((item, i) => (
            <div key={item.name} className="vote-item" style={{ marginBottom: "24px", border: "1px solid #ddd", padding: "16px", borderRadius: "8px", backgroundColor: "#fff" }}>
              <div className="vote-item-title" style={{ fontWeight: "bold", marginBottom: "12px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                {item.name}
              </div>
              <div className="vote-choices" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {item.choices.map((choice, j) => {
                  const id = `choice-${i}-${j}`;
                  const isChecked = answers[item.name] === choice.name;
                  return (
                    <div key={choice.name} style={{ display: "flex", alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", cursor: "pointer", flex: 1, padding: "8px", border: "1px solid", borderColor: isChecked ? "#4CAF50" : "#ccc", borderRadius: "6px", backgroundColor: isChecked ? "#E8F5E9" : "transparent" }}>
                        <input
                          type="radio"
                          name={item.name}
                          id={id}
                          value={choice.name}
                          checked={isChecked}
                          onChange={() => handleChange(item.name, choice.name)}
                          style={{ marginRight: "12px", transform: "scale(1.2)" }}
                        />
                        <span style={{ fontWeight: isChecked ? "bold" : "normal" }}>{choice.name}</span>
                      </label>
                      {renderLinkIcon(choice.link, choice.name)}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {modalOpen && (
          <Modal title={modalTitle} onClose={() => setModalOpen(false)}>
            {modalContent}
          </Modal>
        )}

        <FormButtons 
          mode={isEdit ? "edit" : "new"} 
          onSave={handleSave} 
          onClear={() => setAnswers({})} 
        />
      </div>
      <FormFooter 
        backHref={`/vote/confirm?voteId=${voteId}`} 
        backText="投票確認に戻る" 
      />
    </BaseLayout>
  );
}
