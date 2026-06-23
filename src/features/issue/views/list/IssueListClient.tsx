"use client";

import React, { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchableList } from "@/src/hooks/useSearchableList";
import { SearchableListLayout } from "@/src/components/Layout/SearchableListLayout";
import { Issue, User, Section, IssueGroup } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { issueFilterFn, issueSortFn, IssueFilters } from "@/src/features/issue/lib/issue-search-engine";
import {
  ListFilterGrid, FilterInput, FilterSelect,
  ListRow, ListCellHeader, ListCellSmall
} from "@/src/components/List/ListParts";
import { saveIssueGroup, deleteIssueGroup } from "@/src/features/issue/api/issue-client-service";
import { Modal } from "@/src/components/Modal";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";
import styles from "./IssueList.module.css";

type Props = {
  initialData: {
    issues: Issue[];
    users: User[];
    sections: Section[];
    issueGroups: IssueGroup[];
  };
};

const buildTree = (issues: Issue[]): { issue: Issue; depth: number }[] => {
  const result: { issue: Issue; depth: number }[] = [];
  const visited = new Set<string>();

  // A map of parentId -> child issues
  const childrenMap: Record<string, Issue[]> = {};
  issues.forEach((i) => {
    if (i.parentId) {
      if (!childrenMap[i.parentId]) {
        childrenMap[i.parentId] = [];
      }
      childrenMap[i.parentId].push(i);
    }
  });

  // Find root issues: those whose parent is not in the current list of issues
  const rootIssues = issues.filter(
    (i) => !i.parentId || !issues.some((parent) => parent.id === i.parentId)
  );

  // Helper to recursively traverse
  const traverse = (issue: Issue, depth: number) => {
    if (visited.has(issue.id)) return;
    visited.add(issue.id);
    result.push({ issue, depth });

    const children = childrenMap[issue.id] || [];
    // Preserve the current sorting order of the main list
    const sortedChildren = children.sort((a, b) => {
      const indexA = issues.indexOf(a);
      const indexB = issues.indexOf(b);
      return indexA - indexB;
    });

    sortedChildren.forEach((child) => {
      traverse(child, depth + 1);
    });
  };

  rootIssues.forEach((root) => {
    traverse(root, 0);
  });

  return result;
};

export function IssueListClient({ initialData }: Props) {
  const router = useRouter();
  const { userData } = useAuth();

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");

  const isIssueAdmin = userData?.isSystemAdmin || userData?.isIssueAdmin;

  const initialFilters = useMemo<IssueFilters>(() => ({
    search: "",
    type: "",
    status: "open",
    assigneeId: "",
    sort: "date-asc"
  }), []);

  const list = useSearchableList<Issue, IssueFilters>(
    initialData.issues,
    initialFilters,
    (item, filters) => issueFilterFn(item, filters, userData),
    issueSortFn
  );

  const getAssigneeName = (uid: string) => {
    const u = initialData.users.find((user) => user.id === uid);
    return u?.displayName || "未割り当て";
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

  const getTypeClass = (type: string) => {
    switch (type) {
      case "todo":
        return styles.typeTodo;
      case "bug":
        return styles.typeBug;
      case "question":
        return styles.typeQuestion;
      case "proposal":
        return styles.typeProposal;
      case "request":
        return styles.typeRequest;
      default:
        return "";
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case "not_started":
        return "未実施";
      case "in_progress":
        return "実施中";
      case "completed":
        return "実施済";
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return styles.statusCompleted;
      case "not_started":
        return styles.statusNotStarted;
      case "in_progress":
        return styles.statusInProgress;
      default:
        return "";
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    showSpinner();
    try {
      await saveIssueGroup("new", newGroupName.trim());
      setNewGroupName("");
      router.refresh();
    } catch (err) {
      console.error(err);
      await showDialog("グループの追加に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const handleStartEdit = (group: IssueGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const handleCancelEdit = () => {
    setEditingGroupId(null);
    setEditingGroupName("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingGroupName.trim()) return;

    showSpinner();
    try {
      await saveIssueGroup("edit", editingGroupName.trim(), id);
      setEditingGroupId(null);
      setEditingGroupName("");
      router.refresh();
    } catch (err) {
      console.error(err);
      await showDialog("グループ名の変更に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const handleDeleteGroup = async (group: IssueGroup) => {
    const confirmed = await showDialog(`グループ「${group.name}」を削除しますか？\n（このグループに属していたTODOは未分類になります）`);
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteIssueGroup(group.id);
      router.refresh();
    } catch (err) {
      console.error(err);
      await showDialog("グループの削除に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  // グループごとの整理
  const groupedIssues = useMemo(() => {
    const map: Record<string, Issue[]> = {};
    const unclassified: Issue[] = [];

    initialData.issueGroups.forEach((g) => {
      map[g.id] = [];
    });

    list.filteredData.forEach((issue) => {
      if (issue.groupId && map[issue.groupId]) {
        map[issue.groupId].push(issue);
      } else {
        unclassified.push(issue);
      }
    });

    const groupsWithEarliestDate: { id: string; name: string; issues: { issue: Issue; depth: number }[]; earliestDate: string }[] = [];

    initialData.issueGroups.forEach((g) => {
      const issuesInGroup = map[g.id];
      if (issuesInGroup.length > 0) {
        // そのグループ内の最短（最古）日付を取得
        let earliest = "9999.12.31";
        issuesInGroup.forEach((issue) => {
          const d = issue.date || "9999.12.31";
          if (d < earliest) {
            earliest = d;
          }
        });
        const tree = buildTree(issuesInGroup);
        groupsWithEarliestDate.push({
          id: g.id,
          name: g.name,
          issues: tree,
          earliestDate: earliest,
        });
      }
    });

    if (unclassified.length > 0) {
      let earliest = "9999.12.31";
      unclassified.forEach((issue) => {
        const d = issue.date || "9999.12.31";
        if (d < earliest) {
          earliest = d;
        }
      });
      const tree = buildTree(unclassified);
      groupsWithEarliestDate.push({
        id: "unclassified",
        name: "未分類",
        issues: tree,
        earliestDate: earliest,
      });
    }

    // 各グループの最短タスク日付の昇順でグループ自体をソート
    groupsWithEarliestDate.sort((a, b) => {
      return a.earliestDate.localeCompare(b.earliestDate);
    });

    return groupsWithEarliestDate;
  }, [list.filteredData, initialData.issueGroups]);

  const userGroups = useMemo(() => {
    const groupsMap: Record<string, { label: string; options: { id: string; name: string }[] }> = {};
    
    // 1. 各セクションの入れ物を用意
    initialData.sections.forEach((sec) => {
      groupsMap[sec.id] = {
        label: sec.name,
        options: []
      };
    });
    
    // 2. セクション未指定のユーザー用の入れ物を用意
    const OTHERS_KEY = "others";
    groupsMap[OTHERS_KEY] = {
      label: "その他",
      options: []
    };
    
    // 3. ユーザーをセクションIDに従って分類
    initialData.users.forEach((u) => {
      const targetSecId = u.sectionId && groupsMap[u.sectionId] ? u.sectionId : OTHERS_KEY;
      groupsMap[targetSecId].options.push({
        id: u.id,
        name: u.displayName || "匿名"
      });
    });
    
    // 4. 空ではないグループのみ抽出して返す
    return Object.values(groupsMap).filter(g => g.options.length > 0);
  }, [initialData.sections, initialData.users]);

  const extraSearchHeader = isIssueAdmin ? (
    <button
      onClick={() => setIsGroupModalOpen(true)}
      className="list-add-button"
      style={{
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 12px",
        fontSize: "0.85rem",
        margin: 0,
        height: "auto",
        minHeight: "0",
        backgroundColor: "#4b5563",
        border: "none",
        color: "#fff",
        cursor: "pointer"
      }}
    >
      <i className="fa-solid fa-folder-open" style={{ marginRight: "4px" }}></i> グループ管理
    </button>
  ) : null;

  const extraHeader = (
    <Link
      href="/issue/edit?mode=new"
      className="list-add-button"
      style={{
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 12px",
        fontSize: "0.85rem",
        margin: 0,
        height: "auto",
        minHeight: "0"
      }}
    >
      <i className="fa-solid fa-plus" style={{ marginRight: "4px" }}></i> 新規作成
    </Link>
  );

  return (
    <>
      <SearchableListLayout
        title="TODO"
        icon="fa-solid fa-list-check"
        basePath="/issue"
        list={list}
        hideAddButton={true} // 全ユーザーに表示したいので、レイアウト内蔵のボタンは非表示
        extraHeaderContent={extraHeader}
        extraSearchHeaderContent={extraSearchHeader}
        tableHeaders={["タイトル", "期限", "担当者", "種類", "ステータス"]}
        searchFields={
          <ListFilterGrid>
            <FilterSelect
              label="ステータスを選択"
              options={[
                { id: "open", name: "未完了 (未+実施中)" },
                { id: "not_started", name: "未" },
                { id: "in_progress", name: "実施中" },
                { id: "completed", name: "済" },
              ]}
              value={list.filters.status}
              onChange={(v) => list.updateFilter("status", v)}
            />
            <FilterSelect
              label="担当者を選択"
              groups={userGroups}
              value={list.filters.assigneeId}
              onChange={(v) => list.updateFilter("assigneeId", v)}
            />
          </ListFilterGrid>
        }
      >
        {groupedIssues.map((group) => (
          <React.Fragment key={group.id}>
            {/* グループヘッダー行 */}
            <tr className={styles.groupHeaderRow}>
              <td colSpan={5} className={styles.groupHeaderCell}>
                <i className="fa-solid fa-folder" style={{ marginRight: "6px" }}></i>
                {group.name} ({group.issues.length}件)
              </td>
            </tr>
            {/* 各イシュー行 */}
            {group.issues.map(({ issue, depth }) => (
              <ListRow key={issue.id}>
                {/* タイトル */}
                <ListCellHeader href={`/issue/confirm?issueId=${issue.id}`}>
                  <div
                    style={{
                      paddingLeft: "0px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      wordBreak: "break-all"
                    }}
                  >
                    {depth > 0 && (
                      <span style={{ color: "#94a3b8", fontWeight: "normal", fontSize: "0.85em", flexShrink: 0 }}>
                        ↳
                      </span>
                    )}
                    <span>{issue.title}</span>
                  </div>
                </ListCellHeader>

                {/* 期限 */}
                <ListCellSmall>
                  {issue.date ? (
                    <span className={styles.dateContainer}>
                      {issue.date}
                      <span className={styles.dateType}>
                        {issue.dateType === "until" ? "まで" : "に"}
                      </span>
                    </span>
                  ) : (
                    "-"
                  )}
                </ListCellSmall>

                {/* 担当者 */}
                <ListCellSmall>
                  {getAssigneeName(issue.assigneeId)}
                </ListCellSmall>

                {/* 種類 */}
                <td className="text-center">
                  <span className={`${styles.typeBadge} ${getTypeClass(issue.type)}`}>
                    {getTypeName(issue.type)}
                  </span>
                </td>

                {/* ステータス */}
                <td className="text-center">
                  <span className={`${styles.statusBadge} ${getStatusClass(issue.status)}`}>
                    {getStatusName(issue.status)}
                  </span>
                </td>
              </ListRow>
            ))}
          </React.Fragment>
        ))}
      </SearchableListLayout>

      {isGroupModalOpen && (
        <Modal title="グループ管理" onClose={() => setIsGroupModalOpen(false)}>
          <div className={styles.groupModalContainer}>
            {/* 新規追加フォーム */}
            <form onSubmit={handleAddGroup} className={styles.addGroupForm}>
              <input
                type="text"
                className={styles.groupInput}
                placeholder="新しいグループ名を入力"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <button type="submit" className={styles.groupAddButton}>
                <i className="fa-solid fa-plus"></i> 追加
              </button>
            </form>

            {/* グループ一覧 */}
            <ul className={styles.groupList}>
              {initialData.issueGroups.map((group) => (
                <li key={group.id} className={styles.groupItem}>
                  {editingGroupId === group.id ? (
                    <div className={styles.groupEditForm}>
                      <input
                        type="text"
                        className={styles.groupInput}
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                      />
                      <div className={styles.groupActionButtons}>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(group.id)}
                          className={`${styles.iconButton} ${styles.saveBtn}`}
                          title="保存"
                        >
                          <i className="fa-solid fa-floppy-disk"></i>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className={`${styles.iconButton} ${styles.cancelBtn}`}
                          title="キャンセル"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className={styles.groupItemName}>
                        <i className="fa-solid fa-folder" style={{ marginRight: "6px", color: "#64748b" }}></i>
                        {group.name}
                      </span>
                      <div className={styles.groupActionButtons}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(group)}
                          className={`${styles.iconButton} ${styles.editBtn}`}
                          title="編集"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group)}
                          className={`${styles.iconButton} ${styles.deleteBtn}`}
                          title="削除"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
              {initialData.issueGroups.length === 0 && (
                <li style={{ textAlign: "center", color: "#64748b", padding: "16px" }}>
                  グループはありません。新しいグループを作成してください。
                </li>
              )}
            </ul>
          </div>
        </Modal>
      )}
    </>
  );
}
