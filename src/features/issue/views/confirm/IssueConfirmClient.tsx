"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Issue, User, Section } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { toggleIssueStep } from "@/src/features/issue/api/issue-client-service";
import { buildYouTubeHtml, showSpinner, hideSpinner } from "@/src/lib/functions";
import styles from "./IssueConfirm.module.css";

type Props = {
  issueData: Issue;
  issueId: string;
  users: User[];
  sections: Section[];
};

export function IssueConfirmClient({ issueData, issueId, users, sections }: Props) {
  const router = useRouter();
  const { userData, isAdmin } = useAuth();

  // 編集権限: 管理者、または起票者、または担当者
  const canEdit = isAdmin || userData?.id === issueData.createdBy || userData?.id === issueData.assigneeId;

  const getAssigneeName = (uid: string) => {
    const u = users.find((user) => user.id === uid);
    return u?.displayName || "未割り当て";
  };

  const getCreatorName = (uid: string) => {
    const u = users.find((user) => user.id === uid);
    return u?.displayName || issueData.createdByName || "匿名";
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "todo":
        return "TODO";
      case "bug":
        return "課題";
      case "question":
        return "質問";
      default:
        return type;
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case "not_started":
        return "未";
      case "in_progress":
        return "実施中";
      case "completed":
        return "済";
      default:
        return status;
    }
  };

  // 公開範囲のラベル取得
  const getScopeLabel = () => {
    if (issueData.scope === "all") return "全体";
    if (issueData.scope === "part") {
      const section = sections.find((s) => s.id === issueData.partId);
      return section ? `${section.name}専用` : "パート専用";
    }
    if (issueData.scope === "user") return "ユーザ指定";
    return issueData.scope;
  };

  // チェックリストの切り替え
  const handleCheckboxChange = async (index: number, checked: boolean) => {
    showSpinner();
    try {
      await toggleIssueStep(issueId, index, checked);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      hideSpinner();
    }
  };

  // URLをリンクとYouTube動画にパース
  const renderDescription = (content: string) => {
    if (!content) return "なし";
    const lines = content.split("\n");
    const urlRegex = /^(https?:\/\/[^\s]+)$/;

    return lines.map((line, i) => {
      const trimmedLine = line.trim();
      const match = trimmedLine.match(urlRegex);

      if (match) {
        const url = match[1];
        const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

        return (
          <div key={i} style={{ marginBottom: "1rem" }}>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: "break-all", textDecoration: "underline", color: "#2563eb" }}>
              {url}
            </a>
            {isYouTube && (
              <div
                style={{ marginTop: "0.5rem" }}
                dangerouslySetInnerHTML={{ __html: buildYouTubeHtml(url) }}
              />
            )}
          </div>
        );
      }
      return (
        <React.Fragment key={i}>
          {line}
          <br />
        </React.Fragment>
      );
    });
  };

  return (
    <BaseLayout>
      <ConfirmLayout
        name="TODO"
        icon="fa-solid fa-list-check"
        basePath="/issue"
        dataId={issueId}
        featureIdKey="issueId"
        collectionName="issues"
        overrideAdmin={canEdit}
      >
        {/* 種類 */}
        <DisplayField label="種類">
          {getTypeName(issueData.type)}
        </DisplayField>

        {/* 担当者 */}
        <DisplayField label="担当者">
          {getAssigneeName(issueData.assigneeId)}
        </DisplayField>

        {/* タイトル */}
        <DisplayField label="タイトル">
          {issueData.title}
        </DisplayField>

        {/* 説明 */}
        <DisplayField label="説明">
          <div style={{ lineHeight: "1.6" }}>{renderDescription(issueData.description)}</div>
        </DisplayField>

        {/* ステップ (チェックリスト) */}
        {issueData.steps && issueData.steps.length > 0 && (
          <DisplayField label="ステップ (チェックリスト)">
            <ul className={styles.stepList}>
              {issueData.steps.map((step, idx) => (
                <li key={idx} className={styles.stepItem}>
                  <input
                    type="checkbox"
                    className={styles.stepCheckbox}
                    checked={step.completed}
                    onChange={(e) => handleCheckboxChange(idx, e.target.checked)}
                  />
                  <span className={`${styles.stepText} ${step.completed ? styles.completedText : ""}`}>
                    {step.text}
                  </span>
                </li>
              ))}
            </ul>
          </DisplayField>
        )}

        {/* 期限日 */}
        <DisplayField label="期限日">
          {issueData.date ? `${issueData.date} ${issueData.dateType === "until" ? "まで" : "に"}` : "未設定"}
        </DisplayField>

        {/* ステータス */}
        <DisplayField label="ステータス">
          {getStatusName(issueData.status)}
        </DisplayField>

        {/* 公開範囲 */}
        <DisplayField label="公開範囲">
          <div>{getScopeLabel()}</div>
          {issueData.scope === "user" && issueData.allowedUserIds && issueData.allowedUserIds.length > 0 && (
            <div className={styles.allowedUserList}>
              {issueData.allowedUserIds.map((uid) => (
                <span key={uid} className={styles.allowedUserBadge}>
                  {getAssigneeName(uid)}
                </span>
              ))}
            </div>
          )}
        </DisplayField>

        {/* 添付ファイル */}
        {issueData.files && issueData.files.length > 0 && (
          <DisplayField label="添付ファイル">
            <div className={styles.linkList}>
              {issueData.files.map((file, idx) => (
                <a
                  key={idx}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.fileLinkCard}
                >
                  <i className="fa-solid fa-file"></i>
                  <span className={styles.linkCardText}>{file.name}</span>
                  <i className={`fa-solid fa-arrow-up-right-from-square ${styles.linkCardIconRight}`}></i>
                </a>
              ))}
            </div>
          </DisplayField>
        )}

        {/* 関連リンク */}
        {issueData.links && issueData.links.length > 0 && (
          <DisplayField label="関連リンク">
            <div className={styles.linkList}>
              {issueData.links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.urlLinkCard}
                >
                  <i className="fa-solid fa-link"></i>
                  <span className={styles.linkCardText}>{link.title}</span>
                  <i className={`fa-solid fa-arrow-up-right-from-square ${styles.linkCardIconRight}`}></i>
                </a>
              ))}
            </div>
          </DisplayField>
        )}

        {/* 起票者 */}
        <DisplayField label="起票者">
          {getCreatorName(issueData.createdBy)}
        </DisplayField>
      </ConfirmLayout>
    </BaseLayout>
  );
}
