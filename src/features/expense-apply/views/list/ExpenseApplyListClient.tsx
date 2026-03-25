"use client";

import React, { useEffect, useState } from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { ExpenseApply, ExpenseType } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import Link from "next/link";
import { getExpenseTypesClient } from "@/src/features/expense-apply/api/expense-apply-client-service";
import { format } from "@/src/lib/functions";

type Props = {
  initialExpenses: ExpenseApply[];
};

export function ExpenseApplyListClient({ initialExpenses }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseApply[]>(initialExpenses);
  const [loading, setLoading] = useState(true);
  const [typeMap, setTypeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setBreadcrumbs([{ title: "経費申請", href: "" }]);
    
    // 種別マスタの取得
    getExpenseTypesClient().then(types => {
      const map: Record<string, string> = {};
      types.forEach(t => map[t.id] = t.name);
      setTypeMap(map);
    });
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (!user) return;
    
    const fetchExpenses = async () => {
      const { db } = await import("@/src/lib/firebase");
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const { toPlainObject } = await import("@/src/lib/firestore/utils");
      
      const q = query(
        collection(db, "expenseApplies"),
        where("uid", "==", user.uid)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(toPlainObject) as ExpenseApply[];
      
      items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      
      setExpenses(items);
      setLoading(false);
    };

    fetchExpenses();
  }, [user]);

  const getStatusBadge = (status: ExpenseApply['status']) => {
    switch (status) {
      case "approved": return <span className="status-badge approved">承認済み</span>;
      case "rejected": return <span className="status-badge rejected">否認</span>;
      default: return <span className="status-badge pending">審査中</span>;
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
            <th>状態</th>
            <th>登録日時</th>
            <th>更新日時</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((expense) => (
              <tr key={expense.id}>
                <td className="list-table-row-header">
                  <div style={{ fontSize: "10px", color: "#888", fontWeight: "normal", marginBottom: "2px" }}>
                    {expense.date}
                  </div>
                  <Link prefetch={true} href={`/expense-apply/confirm?expenseId=${expense.id}`} style={{ textDecoration: "none" }}>
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
                <td style={{ textAlign: "center" }}>
                  {getStatusBadge(expense.status)}
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
              <td colSpan={5} className="empty-text">{emptyMsg}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <BaseLayout>
      <ListBaseLayout
        title="経費申請"
        basePath="/expense-apply"
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px", marginTop: "20px" }}>
          <Link 
            href="/expense-apply/edit?mode=new" 
            className="list-add-button"
            style={{ margin: 0, textDecoration: "none" }}
          >
            ＋ 新規経費申請
          </Link>
        </div>

        <div className="container" style={{ marginBottom: "20px" }}>
          <h3 className="section-title"><i className="fa-solid fa-clock"></i> 審査待ち</h3>
          {renderTable(pendingItems, "審査待ちの申請はありません🍀")}
        </div>

        <div className="container" style={{ marginBottom: "20px" }}>
          <h3 className="section-title"><i className="fa-solid fa-circle-xmark"></i> 否認済み</h3>
          <div style={{ fontSize: "0.85rem", color: "#666", marginBottom: "10px", padding: "0 10px" }}>
            ※否認された申請は、詳細画面から編集して再申請することが可能です。
          </div>
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
          .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            color: #fff;
          }
          .pending { background: #999; }
          .approved { background: #4caf50; }
          .rejected { background: #f44336; }
        `}</style>
      </ListBaseLayout>
    </BaseLayout>
  );
}
