"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchableList } from "@/src/hooks/useSearchableList";
import { SearchableListLayout } from "@/src/components/Layout/SearchableListLayout";
import { ExpenseApply } from "@/src/lib/firestore/types";
import { useRouter } from "next/navigation";
import { getExpenseTypesClient } from "@/src/features/expense-apply/api/expense-apply-client-service";
import { format } from "@/src/lib/functions";
import {
  ListFilterGrid, FilterSelect,
  ListRow, ListCellHeader, ListCellSmall
} from "@/src/components/List/ListParts";
import styles from "./ExpenseReviewList.module.css";

type Props = {
  initialExpenses: ExpenseApply[];
  usersMap: Record<string, string>; // uid -> displayName
};

type ExpenseFilters = {
  status: string;
  uid: string;
  eventId: string;
};

export function ExpenseReviewListClient({ initialExpenses, usersMap }: Props) {
  const [typeMap, setTypeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    // 種別マスタの取得
    getExpenseTypesClient().then(types => {
      const map: Record<string, string> = {};
      types.forEach(t => map[t.id] = t.name);
      setTypeMap(map);
    });
  }, []);

  const applicantOptions = useMemo(() => {
    const uids = Array.from(new Set(initialExpenses.map(e => e.uid)));
    return uids.map(uid => ({ id: uid, name: usersMap[uid] || "不明" }))
               .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }, [initialExpenses, usersMap]);

  const eventOptions = useMemo(() => {
    const events = new Map<string, string>();
    initialExpenses.forEach(e => {
      if (e.eventId && e.eventTitle) {
        events.set(e.eventId, e.eventTitle);
      }
    });
    return Array.from(events.entries())
                .map(([id, name]) => ({ id, name }))
                .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }, [initialExpenses]);

  const list = useSearchableList<ExpenseApply, ExpenseFilters>(
    initialExpenses,
    { status: "pending", uid: "", eventId: "" },
    (e, f) => {
      if (f.status && e.status !== f.status) return false;
      if (f.uid && e.uid !== f.uid) return false;
      if (f.eventId && e.eventId !== f.eventId) return false;
      return true;
    },
    (a, b) => {
      // 基本は日付降順
      const dateA = new Date(a.date.replace(/\./g, "/")).getTime();
      const dateB = new Date(b.date.replace(/\./g, "/")).getTime();
      if (dateB !== dateA) return dateB - dateA;
      // 同日の場合は作成日時降順
      return (b.createdAt || 0) - (a.createdAt || 0);
    }
  );

  const statusLabels: Record<string, string> = {
    pending: "審査待ち",
    returned: "差し戻し",
    approved: "承認済み",
  };
  const currentStatusLabel = statusLabels[list.filters.status] || "すべて";

  const getStatusBadge = (status: ExpenseApply['status']) => {
    switch (status) {
      case "approved": return <span className={`${styles.statusBadge} ${styles.approved}`}>承認済み</span>;
      case "returned": return <span className={`${styles.statusBadge} ${styles.rejected}`}>差し戻し</span>;
      default: return <span className={styles.statusBadge}>審査待ち</span>;
    }
  };

  return (
    <SearchableListLayout
      title="経費審査"
      icon="fa-solid fa-clipboard-check"
      basePath="/expense-review"
      list={list}
      hideAddButton={true}
      topSlot={
        <div className="container" style={{
          background: "#fff9c4",
          marginBottom: "1.5rem",
          fontSize: "0.85rem",
          color: "#856404",
          border: "1px solid #ffeeba",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 15px",
        }}>
          <i className="fa-solid fa-circle-info" />
          <span>会計メンバーのみ閲覧可能です。各メンバーからの経費申請を承認・差し戻しできます。</span>
        </div>
      }
      tableHeaders={[
        "日付・経費名", 
        "種別・金額", 
        "申請者", 
        "状態", 
        "操作", 
        { content: "登録日時", className: styles.hideMobile }, 
        { content: "更新日時", className: styles.hideMobile }
      ]}
      searchFields={
        <ListFilterGrid>
          <FilterSelect
            label="ステータス (すべて)"
            options={[
              { id: "pending", name: "審査待ち" },
              { id: "returned", name: "差し戻し" },
              { id: "approved", name: "承認済み" },
            ]}
            value={list.filters.status}
            onChange={(v) => list.updateFilter("status", v)}
          />
          <FilterSelect
            label="申請者を選択"
            options={applicantOptions}
            value={list.filters.uid}
            onChange={(v) => list.updateFilter("uid", v)}
          />
          <FilterSelect
            label="イベントを選択"
            options={eventOptions}
            value={list.filters.eventId}
            onChange={(v) => list.updateFilter("eventId", v)}
          />
        </ListFilterGrid>
      }
      extraHeaderContent={
        <div style={{ fontWeight: "bold", color: "#4caf50" }}>
          {currentStatusLabel}
        </div>
      }
    >
      {list.filteredData.map((expense) => (
        <ListRow key={expense.id}>
          <ListCellHeader href={`/expense-review/review?expenseId=${expense.id}`}>
            <div className={styles.dateSub}>
              {expense.date}
            </div>
            {expense.name}
          </ListCellHeader>
          <td>
            <div className={styles.typeText} style={{ color: expense.typeId === "001" ? "#c62828" : "#2e7d32" }}>
              {typeMap[expense.typeId] || "不明"}<br/>{expense.category}
            </div>
            <div className={styles.amount}>
              ¥{expense.amount.toLocaleString()}
            </div>
          </td>
          <td>
            {usersMap[expense.uid] || "不明"}
          </td>
          <td style={{ textAlign: "center" }}>
            {getStatusBadge(expense.status)}
          </td>
          <td style={{ textAlign: "center" }}>
            <a 
              href={`/expense-review/review?expenseId=${expense.id}`}
              className={`${styles.judgeBtn} ${styles.approvedBtn}`}
              style={{ display: "inline-block", textDecoration: "none" }}
            >
              {expense.status === 'pending' ? "審査" : "詳細"}
            </a>
          </td>
          <ListCellSmall className={styles.hideMobile}>
            {format(expense.createdAt, 'yyyy/MM/dd HH:mm')}
          </ListCellSmall>
          <ListCellSmall className={styles.hideMobile}>
            {format(expense.updatedAt, 'yyyy/MM/dd HH:mm')}
          </ListCellSmall>
        </ListRow>
      ))}
    </SearchableListLayout>
  );
}
