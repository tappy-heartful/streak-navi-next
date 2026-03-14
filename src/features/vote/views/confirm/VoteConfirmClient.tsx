"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { AnswerConfirmLayout } from "@/src/components/Layout/AnswerConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Vote, VoteAnswer } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { isInTerm, buildYouTubeHtml, showDialog, showSpinner, hideSpinner, globalLineDefaultImage } from "@/src/lib/functions";
import { deleteVoteWithAnswers, deleteMyVoteAnswer } from "@/src/features/vote/api/vote-client-service";
import { Modal } from "@/src/components/Modal";

type Props = {
  voteData: Vote;
  voteId: string;
  voteAnswers: VoteAnswer[];
  usersMap: Record<string, {name: string; pictureUrl: string}>;
};

export function VoteConfirmClient({ voteData, voteId, voteAnswers, usersMap }: Props) {
  const router = useRouter();
  const { userData, isAdmin } = useAuth();
  const uid = userData?.id;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  const isActive = isInTerm(voteData.acceptStartDate, voteData.acceptEndDate);
  const myAnswer = voteAnswers.find(a => a.uid === uid)?.answers || {};
  const hasAnswered = Object.keys(myAnswer).length > 0;
  const participantCount = voteAnswers.length;

  const statusClass = !isActive ? "closed" : hasAnswered ? "answered" : "pending";
  const statusText = !isActive ? "期間外" : hasAnswered ? "回答済" : "未回答";

  const handleAdminDelete = async () => {
    const confirmed = await showDialog("投票と全員の回答を削除しますか？\nこの操作は元に戻せません");
    if (!confirmed) return;
    const confirmedAgain = await showDialog("本当に削除しますか？");
    if (!confirmedAgain) return;

    showSpinner();
    try {
      await deleteVoteWithAnswers(voteId);
      hideSpinner();
      await showDialog("削除しました", true);

      showSpinner();
      router.push("/vote");
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
      await deleteMyVoteAnswer(voteId, uid);
      hideSpinner();
      await showDialog("回答を取り消しました", true);

      showSpinner();
      router.refresh(); 
    } catch {
      hideSpinner();
      await showDialog("削除に失敗しました", true);
    }
  };

  const handleVoterModal = (itemTitle: string, choiceName: string) => {
    // 該当する回答者の UID を探す
    const voterUids = voteAnswers
      .filter(ans => ans.answers[itemTitle] === choiceName)
      .map(ans => ans.uid);

    const votersHtml = voterUids.map(uid => {
      const user = usersMap[uid];
      const name = user ? user.name : "退会済みユーザ";
      const pic = user?.pictureUrl || globalLineDefaultImage;

      return (
        <div key={uid} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
          <img src={pic} alt={name} style={{ width: "32px", height: "32px", borderRadius: "50%", marginRight: "8px" }} onError={(e) => { e.currentTarget.src = globalLineDefaultImage; }} />
          <span>{name}</span>
        </div>
      );
    });

    setModalTitle(`${choiceName} に投票した人`);
    setModalContent(<div>{votersHtml}</div>);
    setModalOpen(true);
  };

  const handleYoutubeModal = (url: string, title: string) => {
    const html = buildYouTubeHtml(url, true, false);
    setModalTitle(title);
    setModalContent(<div dangerouslySetInnerHTML={{ __html: html }} />);
    setModalOpen(true);
  };

  const answerMenuSlot = (
    <>
      <Link href={`/vote/answer?voteId=${voteId}`} className="edit-button" style={{ textDecoration: "none", display: "inline-block" }}>
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
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
      <Link href={`/vote/edit?voteId=${voteId}&mode=edit`} className="edit-button" style={{ textDecoration: "none" }}>
        編集する
      </Link>
      <Link href={`/vote/edit?voteId=${voteId}&mode=copy`} className="edit-button" style={{ textDecoration: "none", backgroundColor: "#ff9800" }}>
        コピーして作成
      </Link>
      <button
        type="button"
        className="edit-button"
        onClick={() => {
          showSpinner();
          router.push(`/vote/link-edit?voteId=${voteId}`);
        }}
        style={{ backgroundColor: "#9c27b0" }}
      >
        投票リンク設定
      </button>
    </div>
  );

  // Link helper
  const renderLink = (linkUrl: string | undefined, text: string) => {
    if (!linkUrl) return <>{text}</>;
    try {
      const u = new URL(linkUrl);
      if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
        return (
          <a href="#" onClick={(e) => { e.preventDefault(); handleYoutubeModal(linkUrl, text); }} style={{ color: "blue", textDecoration: "underline" }}>
            {text}
          </a>
        );
      }
    } catch (e) {}
    return <a href={linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: "blue", textDecoration: "underline" }}>{text}</a>;
  };

  return (
    <BaseLayout>
      <AnswerConfirmLayout
        name="投票"
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

        {isAdmin && voteData.hideVotes && (
          <div style={{ color: "#d32f2f", fontSize: "0.9em", marginTop: "1rem" }}>
            ※「票数を非公開」のため投票結果は一般メンバーには見えていません
          </div>
        )}

        {/* 投票結果表示 */}
        <div id="vote-items" style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "1.2rem", borderBottom: "2px solid #4CAF50", paddingBottom: "8px", marginBottom: "16px" }}>
            <i className="fas fa-poll"></i> 投票結果
          </h3>
          {(voteData.items || []).map(item => {
            // Count votes for this item
            const results: Record<string, number> = {};
            item.choices.forEach(c => results[c.name] = 0);
            voteAnswers.forEach(ans => {
              const choiceName = ans.answers[item.name];
              if (choiceName && results[choiceName] !== undefined) {
                results[choiceName] += 1;
              }
            });

            const maxVotes = Math.max(...Object.values(results), 1);

            return (
              <div key={item.name} className="genre-block" style={{ marginBottom: "2rem", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                <div className="genre-title" style={{ fontWeight: "bold", padding: "12px 16px", backgroundColor: "#f4f4f4", borderBottom: "1px solid #ddd", fontSize: "1.1rem" }}>
                  {renderLink(item.link, item.name)}
                </div>
                <div style={{ padding: "16px" }}>
                  {item.choices.map(choice => {
                    const count = results[choice.name] || 0;
                    const percent = (count / maxVotes) * 100;
                    const isMyChoice = myAnswer[item.name] === choice.name;
                    const myPic = usersMap[uid || ""]?.pictureUrl || globalLineDefaultImage;

                    const canViewResults = isAdmin || !voteData.hideVotes;
                    const canViewVoters = canViewResults && !voteData.isAnonymous && count > 0;

                    return (
                      <div key={choice.name} style={{ marginBottom: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontWeight: isMyChoice ? "bold" : "normal" }}>
                            {isMyChoice && <img src={myPic} alt="my choice" style={{ width: "20px", height: "20px", borderRadius: "50%", marginRight: "8px", verticalAlign: "middle" }} onError={(e) => { e.currentTarget.src = globalLineDefaultImage; }} />}
                            {renderLink(choice.link, choice.name)}
                          </span>
                        </div>
                        {canViewResults && (
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <div style={{ flex: 1, backgroundColor: "#e0e0e0", height: "auto", borderRadius: "4px", overflow: "hidden" }}>
                              <div style={{ width: `${percent}%`, backgroundColor: isMyChoice ? "#4CAF50" : "#2196F3", height: "16px" }} />
                            </div>
                            <div style={{ marginLeft: "12px", minWidth: "40px", textAlign: "right", fontSize: "0.9em" }}>
                              {canViewVoters ? (
                                <a href="#" onClick={(e) => { e.preventDefault(); handleVoterModal(item.name, choice.name); }} style={{ color: "#1a73e8", textDecoration: "underline" }}>
                                  {count}票
                                </a>
                              ) : (
                                <span>{count}票</span>
                              )}
                            </div>
                          </div>
                        )}
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
      </AnswerConfirmLayout>
    </BaseLayout>
  );
}
