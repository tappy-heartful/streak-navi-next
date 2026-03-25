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
      case "approved": return <span className="status-badge approved">承認済み</span>;
      case "rejected": return <span className="status-badge rejected">否認</span>;
      default: return <span className="status-badge pending">審査待ち</span>;
    }
  };

  const pendingItems = expenses.filter(e => e.status === 'pending');
  const approvedItems = expenses.filter(e => e.status === 'approved');
  const rejectedItems = expenses.filter(e => e.status === 'rejected');

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
                  <div style={{ fontSize: "10px", color: "#888", fontWeight: "normal", marginBottom: "2px" }}>
                    {expense.date}
                  </div>
                  <Link href={`/expense-review/review?expenseId=${expense.id}`} style={{ textDecoration: "none" }}>
                    {expense.name}
                  </Link>
                </td>
                <td>
                  <div className="list-text-small" style={{ color: expense.typeId === "001" ? "#c62828" : "#2e7d32" }}>
                    {typeMap[expense.typeId] || "不明"}<br/>{expense.category}
                  </div>
                  <div style={{ textAlign: "right", fontWeight: "bold", marginTop: "4px" }}>
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
                    className="judge-btn approved-btn"
                    style={{ textDecoration: "none" }}
                  >
                    {expense.status === 'pending' ? "審査" : "詳細"}
                  </Link>
                </td>
                <td style={{ fontSize: "11px", color: "#666", textAlign: "center" }}>
                  {format(expense.createdAt, 'yyyy/MM/dd HH:mm')}
                </td>
                <td style={{ fontSize: "11px", color: "#666", textAlign: "center" }}>
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
        basePath="/expense-review"
      >
        <div style={{ padding: "10px", background: "#f5f5f7", borderRadius: "8px", marginBottom: "20px", marginTop: "20px", fontSize: "0.9rem", color: "#666" }}>
          <i className="fa-solid fa-circle-info" style={{ marginRight: "4px" }} />
          会計メンバーのみ閲覧可能です。各メンバーからの経費申請を承認・拒否できます。
        </div>

        <div className="container" style={{ marginBottom: "20px" }}>
          <h3 className="section-title"><i className="fa-solid fa-clock"></i> 審査待ち</h3>
          {renderTable(pendingItems, "審査待ちの申請はありません🍀")}
        </div>

        <div className="container" style={{ marginBottom: "20px" }}>
          <h3 className="section-title"><i className="fa-solid fa-circle-xmark"></i> 否認済み</h3>
          {renderTable(rejectedItems, "否認された申請はありません")}
        </div>

        <div className="container" style={{ marginBottom: "20px" }}>
          <h3 className="section-title"><i className="fa-solid fa-circle-check"></i> 承認済み</h3>
          {renderTable(approvedItems, "承認済みの申請はありません")}
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
            margin-top: 10px;
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
