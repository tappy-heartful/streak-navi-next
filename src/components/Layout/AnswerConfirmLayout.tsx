"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormFooter } from "../Form/FormFooter";
import { DetailActionButtons } from "../Form/DetailActionButtons";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { showDialog, archiveAndDeleteDoc } from "@/src/lib/functions";

export type AnswerStatusType = "answered" | "pending" | "closed";

type Props = {
  name: string;           // "曲募集"
  icon?: string;
  basePath: string;       // "/call"
  dataId: string;
  featureIdKey: string;   // "callId"
  /** デフォルト削除を使う場合のコレクション名 */
  collectionName?: string;
  /** 回答ステータス */
  answerStatus: AnswerStatusType;
  answerStatusText: string;  // "回答済" | "未回答" | "期間外"
  /** 受付中かどうか（回答メニューの表示切替） */
  isActive: boolean;
  /** カスタム削除処理（カスケード削除など） */
  onDelete?: () => Promise<void>;
  afterDeletePath?: string;
  hideCopy?: boolean;
  /** 回答メニュー内のボタン群（受付中のみ表示） */
  answerMenuSlot?: React.ReactNode;
  /** 管理者メニューに追加するボタン群 */
  adminExtraSlot?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * 回答ステータスバッジ・回答メニュー・管理者ボタンを持つ確認画面共通レイアウト
 * 投票・出欠・曲募集など「ユーザーが回答する」系の確認画面で共通利用する
 */
export const AnswerConfirmLayout = ({
  name, icon, basePath, dataId, featureIdKey,
  collectionName, answerStatus, answerStatusText,
  isActive, onDelete, afterDeletePath,
  hideCopy, answerMenuSlot, adminExtraSlot, children
}: Props) => {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbs([
      { title: `${name}一覧`, href: basePath },
      { title: `${name}確認`, href: "" },
    ]);
  }, [setBreadcrumbs, name, basePath]);

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
      return;
    }
    if (!collectionName) return;
    const confirmed = await showDialog(`この${name}を削除しますか？\nこの操作は元に戻せません。`);
    if (!confirmed) return;
    
    const { showSpinner, hideSpinner } = await import("@/src/lib/functions");
    showSpinner();
    try {
      await archiveAndDeleteDoc(collectionName, dataId);
      hideSpinner();
      await showDialog("削除しました", true);
      
      showSpinner(); // 遷移用スピナー
      router.push(afterDeletePath ?? basePath);
    } catch {
      hideSpinner();
      await showDialog("削除に失敗しました", true);
    }
  };

  const onEdit = () => {
    import("@/src/lib/functions").then(({ showSpinner }) => showSpinner());
    router.push(`${basePath}/edit?mode=edit&${featureIdKey}=${dataId}`);
  };

  const onCopy = () => {
    import("@/src/lib/functions").then(({ showSpinner }) => showSpinner());
    router.push(`${basePath}/edit?mode=copy&${featureIdKey}=${dataId}`);
  };

  return (
    <>
      <div className="page-header">
        <h1>{icon && <><i className={icon} />{" "}</>}{name}確認</h1>
      </div>

      <div className="container">
        {/* 回答ステータスバッジ */}
        <div className="answer-status-container">
          <span className={`answer-status ${answerStatus}`}>{answerStatusText}</span>
        </div>

        {children}

        {/* 回答メニュー（受付中のみ） */}
        {isActive && answerMenuSlot && (
          <div id="answer-menu" className="menu-section" style={{ marginTop: "1.5rem" }}>
            <h2 className="menu-title">回答メニュー</h2>
            <div className="confirm-buttons">
              {answerMenuSlot}
            </div>
          </div>
        )}

        {/* 管理者メニュー */}
        {isAdmin && (
          <>
            <DetailActionButtons
              show={isAdmin}
              onEdit={onEdit}
              onCopy={onCopy}
              onDelete={handleDelete}
              hideCopy={hideCopy}
            />
            {adminExtraSlot && (
              <div className="menu-section" style={{ marginTop: "1rem" }}>
                <div className="confirm-buttons">
                  {adminExtraSlot}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <FormFooter backHref={basePath} backText={`${name}一覧`} />
    </>
  );
};
