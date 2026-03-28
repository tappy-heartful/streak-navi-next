"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
  usersMap: Record<string, { name: string; pictureUrl: string }>;
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
      router.refresh();
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
      router.refresh();
    } catch {
      hideSpinner();
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

    setModalTitle(`${choiceName} に投票した人`);
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
      投票リンク設定
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
        name="投票"
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

        {isAdmin && voteData.hideVotes && (
          <p className="vote-msg">※「票数を非公開」のため投票結果は一般メンバーには見えていません</p>
        )}

        {/* 投票結果 */}
        <div id="vote-items-container" style={{ marginTop: "1.5rem" }}>
          {(voteData.items || []).map(item => {
            const results: Record<string, number> = {};
            item.choices.forEach(c => { results[c.name] = 0; });
            voteAnswers.forEach(ans => {
              const choiceName = ans.answers[item.name];
              if (choiceName && results[choiceName] !== undefined) results[choiceName]++;
            });
            const maxVotes = Math.max(...Object.values(results), 1);

            return (
              <div key={item.name} className="vote-item">
                <div className="vote-item-title">
                  {renderLink(item.link, item.name)}
                </div>
                <div className="vote-results">
                  {item.choices.map(choice => {
                    const count = results[choice.name] || 0;
                    const percent = canViewResults ? (count / maxVotes) * 100 : 0;
                    const isMyChoice = myAnswer[item.name] === choice.name;
                    const canVoterLink = showVoterLink && count > 0;

                    return (
                      <div key={choice.name} className={`result-bar${isMyChoice ? " my-choice" : ""}`}>
                        <div className="label" style={!canViewResults ? { width: "100%" } : undefined}>
                          {isMyChoice && (
                            <img
                              src={myPic}
                              alt="あなたの選択"
                              className="my-choice-icon"
                              onError={(e) => { e.currentTarget.src = globalLineDefaultImage; }}
                            />
                          )}
                          {renderLink(choice.link, choice.name)}
                        </div>
                        {canViewResults && (
                          <>
                            <div className="bar-container">
                              <div className="bar" style={{ width: `${percent}%` }} />
                            </div>
                            <div className="vote-count">
                              {canVoterLink ? (
                                <a href="#" onClick={(e) => { e.preventDefault(); handleVoterModal(item.name, choice.name); }}>
                                  {count}票
                                </a>
                              ) : (
                                <span>{count}票</span>
                              )}
                            </div>
                          </>
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
