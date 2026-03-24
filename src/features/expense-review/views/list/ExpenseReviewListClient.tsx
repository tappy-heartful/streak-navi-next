"use client";

import React, { useState, useEffect } from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { ExpenseApply } from "@/src/lib/firestore/types";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  initialExpenses: ExpenseApply[];
  usersMap: Record<string, string>; // uid -> displayName
};

export function ExpenseReviewListClient({ initialExpenses, usersMap }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const router = useRouter();

  useEffect(() => {
    setBreadcrumbs([{ title: "経費審査", href: "" }]);
  }, [setBreadcrumbs]);

  const [expenses] = useState<ExpenseApply[]>(initialExpenses);

  const getStatusBadge = (status: ExpenseApply['status']) => {
    switch (status) {
      case "approved": return <span className="status-badge approved">承認済み</span>;
      case "rejected": return <span className="status-badge rejected">否認</span>;
      default: return <span className="status-badge pending">審査待ち</span>;
    }
  };

  const pendingItems = expenses.filter(e => e.status === 'pending');
  const approvedItems = expenses.filter(e => e.status === 'approved');
  const rejectedItems = expenses.filter(e => e.status === 'rejected');

  const renderTable = (items: ExpenseApply[], emptyMsg: string) => (
    <div className="table-wrapper" style={{ marginBottom: "30px" }}>
      <table className="list-table">
        <thead>
          <tr>
            <th style={{ width: "100px" }}>日付</th>
            <th style={{ width: "100px" }}>申請者</th>
            <th style={{ width: "120px" }}>種別</th>
            <th>経費名</th>
            <th style={{ width: "100px" }}>金額</th>
            <th style={{ width: "100px" }}>状態</th>
            <th style={{ width: "100px" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((expense) => (
              <tr key={expense.id} style={{ opacity: expense.status !== "pending" ? 0.8 : 1 }}>
                <td>
                  <Link prefetch={true} href={`/expense-review/review?expenseId=${expense.id}`}>
                    {expense.date}
                  </Link>
                </td>
                <td>
                  {usersMap[expense.uid] || "不明"}
                </td>
                <td>
                  <div className="list-text-small" style={{ color: expense.type === "expenditure" ? "#c62828" : "#2e7d32" }}>
                    {expense.type === "expenditure" ? "支出" : "収入"} / {expense.category}
                  </div>
                </td>
                <td>
                  <Link href={`/expense-review/review?expenseId=${expense.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="list-table-row-header">{expense.name}</div>
                  </Link>
                </td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  ¥{expense.amount.toLocaleString()}
                </td>
                <td style={{ textAlign: "center" }}>
                  {getStatusBadge(expense.status)}
                </td>
                <td style={{ textAlign: "center" }}>
                  <Link 
                    href={`/expense-review/review?expenseId=${expense.id}`}
                    className="judge-btn approved-btn"
                    style={{ textDecoration: "none" }}
                  >
                    {expense.status === 'pending' ? "審査" : "詳細"}
                  </Link>
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
        basePath="/expense-review"
      >
        <div className="container" style={{ paddingTop: "20px" }}>
          <div style={{ padding: "10px", background: "#f5f5f7", borderRadius: "8px", marginBottom: "20px", fontSize: "0.9rem", color: "#666" }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: "4px" }} />
            会計メンバーのみ閲覧可能です。各メンバーからの経費申請を承認・拒否できます。
          </div>

          <h3 className="section-title"><i className="fa-solid fa-clock"></i> 審査待ち</h3>
          {renderTable(pendingItems, "審査待ちの申請はありません🍀")}

          <h3 className="section-title"><i className="fa-solid fa-circle-check"></i> 承認済み</h3>
          {renderTable(approvedItems, "承認済みの申請はありません")}

          <h3 className="section-title"><i className="fa-solid fa-circle-xmark"></i> 否認済み</h3>
          {renderTable(rejectedItems, "否認された申請はありません")}
        </div>

        <style jsx>{`
          .section-title {
            font-size: 1.1rem;
            margin-bottom: 12px;
            color: #333;
            border-left: 4px solid #4caf50;
            padding-left: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; color: #fff; }
          .pending { background: #999; }
          .approved { background: #4caf50; }
          .rejected { background: #f44336; }
          .judge-btn { border: none; padding: 4px 12px; border-radius: 4px; color: white; font-size: 11px; font-weight: bold; cursor: pointer; display: inline-block; }
          .approved-btn { background: #4caf50; }
          .rejected-btn { background: #f44336; }
          .judge-btn:hover { opacity: 0.8; }
        `}</style>
      </ListBaseLayout>
    </BaseLayout>
  );
}
