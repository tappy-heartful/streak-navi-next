"use client";

import React, { useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchableList } from "@/src/hooks/useSearchableList";
import { SearchableListLayout } from "@/src/components/Layout/SearchableListLayout";
import { Issue, User } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { issueFilterFn, issueSortFn, IssueFilters } from "@/src/features/issue/lib/issue-search-engine";
import {
  ListFilterGrid, FilterInput, FilterSelect,
  ListRow, ListCellHeader, ListCellSmall
} from "@/src/components/List/ListParts";
import styles from "./IssueList.module.css";

type Props = {
  initialData: {
    issues: Issue[];
    users: User[];
  };
};

export function IssueListClient({ initialData }: Props) {
  const { userData } = useAuth();

  const initialFilters = useMemo<IssueFilters>(() => ({
    search: "",
    type: "",
    status: "open",
    assigneeId: userData?.id || "",
    sort: "date-asc"
  }), [userData?.id]);

  const list = useSearchableList<Issue, IssueFilters>(
    initialData.issues,
    initialFilters,
    (item, filters) => issueFilterFn(item, filters, userData),
    issueSortFn
  );

  useEffect(() => {
    if (userData?.id) {
      list.updateFilter("assigneeId", userData.id);
    }
  }, [userData?.id]);

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
      default:
        return "";
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

  const getStatusClass = (status: string) => {
    switch (status) {
      case "not_started":
        return styles.statusNotStarted;
      case "in_progress":
        return styles.statusInProgress;
      case "completed":
        return styles.statusCompleted;
      default:
        return "";
    }
  };

  const userOptions = initialData.users.map((u) => ({
    id: u.id,
    name: u.displayName || "匿名",
  }));

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
    <SearchableListLayout
      title="TODO"
      icon="fa-solid fa-list-check"
        basePath="/issue"
        list={list}
        hideAddButton={true} // 全ユーザーに表示したいので、レイアウト内蔵のボタンは非表示
        extraHeaderContent={extraHeader}
        tableHeaders={["タイトル", "期限", "担当者", "種類", "ステータス"]}
      searchFields={
        <ListFilterGrid>
          <FilterInput
            placeholder="タイトル・説明で検索..."
            value={list.filters.search}
            onChange={(v) => list.updateFilter("search", v)}
          />
          <FilterSelect
            label="種類を選択"
            options={[
              { id: "todo", name: "TODO" },
              { id: "bug", name: "課題" },
              { id: "question", name: "質問" },
            ]}
            value={list.filters.type}
            onChange={(v) => list.updateFilter("type", v)}
          />
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
            options={userOptions}
            value={list.filters.assigneeId}
            onChange={(v) => list.updateFilter("assigneeId", v)}
          />
          <FilterSelect
            label="並び替え"
            options={[
              { id: "date-asc", name: "期限の近い順" },
              { id: "date-desc", name: "期限の遠い順" },
              { id: "createdAt-desc", name: "新着順" },
              { id: "createdAt-asc", name: "古い順" },
            ]}
            value={list.filters.sort}
            onChange={(v) => list.updateFilter("sort", v)}
          />
        </ListFilterGrid>
      }
    >
      {list.filteredData.map((issue) => (
        <ListRow key={issue.id}>
          {/* タイトル */}
          <ListCellHeader href={`/issue/confirm?issueId=${issue.id}`}>
            {issue.title}
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
    </SearchableListLayout>
  );
}
