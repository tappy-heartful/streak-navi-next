"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Issue, User, Section, IssueGroup, Event } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { toggleIssueStep, updateIssueParent } from "@/src/features/issue/api/issue-client-service";
import { buildYouTubeHtml, showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";
import { Modal } from "@/src/components/Modal";
import styles from "./IssueConfirm.module.css";

type Props = {
  issueData: Issue;
  issueId: string;
  users: User[];
  sections: Section[];
  issueGroups: IssueGroup[];
  events: Event[];
  issues: Issue[];
};

export function IssueConfirmClient({ issueData, issueId, users, sections, issueGroups, events, issues }: Props) {
  const router = useRouter();
  const { userData, isAdmin } = useAuth();

  const parentIssue = issueData.parentId ? issues.find((i) => i.id === issueData.parentId) : null;
  const childIssues = issues.filter((i) => i.parentId === issueId);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Find eligible existing issues to be linked as a child
  const eligibleChildIssues = React.useMemo(() => {
    return issues.filter((i) => {
      // 1. Not itself
      if (i.id === issueId) return false;
      // 2. Not already a child of current issue
      if (i.parentId === issueId) return false;
      // 3. Must not have a parent itself (cannot make a child task another child task)
      if (i.parentId) return false;
      // 4. Must not have any children of its own (cannot make a parent task a child)
      const hasChildrenOfItsOwn = issues.some((child) => child.parentId === i.id);
      if (hasChildrenOfItsOwn) return false;
      
      return true;
    });
  }, [issues, issueId]);

  const filteredEligibleIssues = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return eligibleChildIssues;
    return eligibleChildIssues.filter(
      (i) => i.title.toLowerCase().includes(term) || i.description?.toLowerCase().includes(term)
    );
  }, [eligibleChildIssues, searchTerm]);

  const handleLinkChild = async (childId: string) => {
    const child = issues.find(i => i.id === childId);
    const confirmed = await showDialog(`「${child?.title}」をこのTODOの子TODOとして設定しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      await updateIssueParent(childId, issueId);
      setIsLinkModalOpen(false);
      setSearchTerm("");
      router.refresh();
    } catch (err) {
      console.error(err);
      await showDialog("子TODOの追加に失敗しました。");
    } finally {
      hideSpinner();
    }
  };

  // 編集権限: 管理者、または起票者、または担当者
  const canEdit = isAdmin || userData?.id === issueData.createdBy || userData?.id === issueData.assigneeId;

  const getGroupName = (groupId?: string) => {
    if (!groupId) return "未分類";
    const group = issueGroups.find((g) => g.id === groupId);
    return group?.name || "未分類";
  };

  const getRelatedEvents = () => {
    if (!issueData.eventIds || issueData.eventIds.length === 0) return null;
    const related = issueData.eventIds
      .map((id) => events.find((e) => e.id === id))
      .filter(Boolean) as Event[];
    return related.length > 0 ? related : null;
  };

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
      case "proposal":
        return "提案";
      case "request":
        return "要望";
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

        {/* グループ */}
        <DisplayField label="グループ">
          {getGroupName(issueData.groupId)}
        </DisplayField>

        {/* 親TODO */}
        {parentIssue && (
          <DisplayField label="親TODO">
            <Link href={`/issue/confirm?issueId=${parentIssue.id}`} className={styles.parentLink}>
              <i className="fa-solid fa-folder-tree" style={{ marginRight: "4px" }}></i>
              {parentIssue.title}
            </Link>
          </DisplayField>
        )}

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

        {/* 子TODO */}
        {!issueData.parentId && (
          <DisplayField label="子TODO">
            {childIssues.length > 0 && (
              <div className={styles.childList} style={{ marginBottom: "12px" }}>
                {childIssues.map((child) => (
                  <Link
                    key={child.id}
                    href={`/issue/confirm?issueId=${child.id}`}
                    className={styles.childLinkCard}
                  >
                    <i className="fa-solid fa-list-check" style={{ marginRight: "4px" }}></i>
                    <span className={styles.linkCardText}>{child.title}</span>
                    <i className={`fa-solid fa-chevron-right ${styles.linkCardIconRight}`}></i>
                  </Link>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Link
                href={`/issue/edit?mode=new&parentId=${issueId}`}
                className={styles.addChildBtn}
              >
                <i className="fa-solid fa-plus"></i> 子TODOを新規作成
              </Link>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(true)}
                className={styles.linkChildBtn}
              >
                <i className="fa-solid fa-link"></i> 既存を子に設定
              </button>
            </div>
          </DisplayField>
        )}

        {/* 担当者 */}
        <DisplayField label="担当者">
          {getAssigneeName(issueData.assigneeId)}
        </DisplayField>

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

        {/* 関連するイベント */}
        {getRelatedEvents() && (
          <DisplayField label="関連するイベント">
            <div className={styles.linkList}>
              {getRelatedEvents()!.map((e) => (
                <Link
                  key={e.id}
                  href={`/event/confirm?eventId=${e.id}`}
                  className={styles.urlLinkCard}
                >
                  <i className="fa-solid fa-calendar-days"></i>
                  <span className={styles.linkCardText}>
                    {e.title} {e.date && `(${e.date})`}
                  </span>
                  <i className={`fa-solid fa-arrow-up-right-from-square ${styles.linkCardIconRight}`}></i>
                </Link>
              ))}
            </div>
          </DisplayField>
        )}

        {/* 起票者 */}
        <DisplayField label="起票者">
          {getCreatorName(issueData.createdBy)}
        </DisplayField>
      </ConfirmLayout>
      {isLinkModalOpen && (
        <Modal title="既存TODOを子に設定" onClose={() => setIsLinkModalOpen(false)}>
          <div className={styles.linkModalContainer}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="TODOのタイトルで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <ul className={styles.modalIssueList}>
              {filteredEligibleIssues.map((issue) => {
                const groupName = issue.groupId ? issueGroups.find(g => g.id === issue.groupId)?.name : "未分類";
                return (
                  <li key={issue.id} className={styles.modalIssueItem} onClick={() => handleLinkChild(issue.id)}>
                    <div className={styles.modalIssueTitle}>{issue.title}</div>
                    <div className={styles.modalIssueSub}>
                      <span className={styles.modalIssueGroup}>📁 {groupName || "未分類"}</span>
                      {issue.assigneeName && <span className={styles.modalIssueAssignee}>👤 {issue.assigneeName}</span>}
                    </div>
                  </li>
                );
              })}
              {filteredEligibleIssues.length === 0 && (
                <li style={{ textAlign: "center", color: "#64748b", padding: "24px 12px" }}>
                  候補となるTODOが見つかりません。
                </li>
              )}
            </ul>
          </div>
        </Modal>
      )}
    </BaseLayout>
  );
}
