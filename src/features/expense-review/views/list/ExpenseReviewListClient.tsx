"use client";

import React, { useState, useEffect } from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { ExpenseApply, ExpenseType } from "@/src/lib/firestore/types";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getExpenseTypesClient } from "@/src/features/expense-apply/api/expense-apply-client-service";
import { format } from "@/src/lib/functions";
import styles from "./ExpenseReviewList.module.css";

type Props = {
  initialExpenses: ExpenseApply[];
  usersMap: Record<string, string>; // uid -> displayName
};

export function ExpenseReviewListClient({ initialExpenses, usersMap }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const router = useRouter();
  const [typeMap, setTypeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setBreadcrumbs([{ title: "経費審査", href: "" }]);
    
    // 種別マスタの取得
    getExpenseTypesClient().then(types => {
      const map: Record<string, string> = {};
      types.forEach(t => map[t.id] = t.name);
      setTypeMap(map);
    });
  }, [setBreadcrumbs]);

  const [expenses] = useState<ExpenseApply[]>(initialExpenses);

  const getStatusBadge = (status: ExpenseApply['status']) => {
    switch (status) {
      case "approved": return <span className={`${styles.statusBadge} ${styles.approved}`}>承認済み</span>;
      case "returned": return <span className={`${styles.statusBadge} ${styles.rejected}`}>差し戻し</span>;
      default: return <span className={styles.statusBadge}>審査待ち</span>;
    }
  };

  const pendingItems = expenses.filter(e => e.status === 'pending');
  const approvedItems = expenses.filter(e => e.status === 'approved');
  const rejectedItems = expenses.filter(e => e.status === 'returned');

  const renderTable = (items: ExpenseApply[], emptyMsg: string) => (
    <div className="table-wrapper">
      <table className="list-table">
        <thead>
          <tr>
            <th>日付・経費名</th>
            <th>種別・金額</th>
            <th>申請者</th>
            <th>状態</th>
            <th>操作</th>
            <th>登録日時</th>
            <th>更新日時</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((expense) => (
              <tr key={expense.id} style={{ opacity: expense.status !== "pending" ? 0.8 : 1 }}>
                <td className="list-table-row-header">
                  <div className={styles.dateSub}>
                    {expense.date}
                  </div>
                  <Link href={`/expense-review/review?expenseId=${expense.id}`} style={{ textDecoration: "none" }}>
                    {expense.name}
                  </Link>
                </td>
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
                  <Link 
                    href={`/expense-review/review?expenseId=${expense.id}`}
                    className={`${styles.judgeBtn} ${styles.approvedBtn}`}
                  >
                    {expense.status === 'pending' ? "審査" : "詳細"}
                  </Link>
                </td>
                <td className={styles.timestamp}>
                  {format(expense.createdAt, 'yyyy/MM/dd HH:mm')}
                </td>
                <td className={styles.timestamp}>
                  {format(expense.updatedAt, 'yyyy/MM/dd HH:mm')}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="empty-text">{emptyMsg}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <BaseLayout>
      <ListBaseLayout
        title="経費審査"
        icon="fa-solid fa-clipboard-check"
        basePath="/expense-review"
      >
        <div className={styles.infoBox}>
          <i className="fa-solid fa-circle-info" style={{ marginRight: "4px" }} />
          会計メンバーのみ閲覧可能です。各メンバーからの経費申請を承認・差し戻しできます。
        </div>

        <div className="container" style={{ marginBottom: "20px" }}>
          <h3 className={styles.sectionTitle}><i className="fa-solid fa-clock"></i> 審査待ち</h3>
          {renderTable(pendingItems, "審査待ちの申請はありません🍀")}
        </div>

        <div className="container" style={{ marginBottom: "20px" }}>
          <h3 className={styles.sectionTitle}><i className="fa-solid fa-rotate-left"></i> 差し戻し</h3>
          {renderTable(rejectedItems, "差し戻された申請はありません")}
        </div>

        <div className="container" style={{ marginBottom: "20px" }}>
          <h3 className={styles.sectionTitle}><i className="fa-solid fa-circle-check"></i> 承認済み</h3>
          {renderTable(approvedItems, "承認済みの申請はありません")}
        </div>
      </ListBaseLayout>
    </BaseLayout>
  );
}
