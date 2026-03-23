"use client";

import React, { useEffect } from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { ExpenseApply } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import Link from "next/link";
import { getDayOfWeek } from "@/src/lib/functions";

type Props = {
  initialExpenses: ExpenseApply[];
};

export function ExpenseApplyListClient({ initialExpenses }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const { user } = useAuth();
  const [expenses, setExpenses] = React.useState<ExpenseApply[]>(initialExpenses);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    setBreadcrumbs([{ title: "経費申請", href: "" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (!user) return;
    
    const fetchExpenses = async () => {
      const { db } = await import("@/src/lib/firebase");
      const { collection, query, where, getDocs, orderBy } = await import("firebase/firestore");
      const { toPlainObject } = await import("@/src/lib/firestore/utils");
      
      const q = query(
        collection(db, "expenseApplies"),
        where("uid", "==", user.uid),
        orderBy("date", "desc")
      );
      const snap = await getDocs(q);
      setExpenses(snap.docs.map(toPlainObject) as ExpenseApply[]);
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

  return (
    <BaseLayout>
      <ListBaseLayout
        title="経費申請"
        basePath="/expense-apply"
      >
        <div className="container" style={{ paddingTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <Link 
              href="/expense-apply/edit?mode=new" 
              className="list-add-button"
              style={{ margin: 0, textDecoration: "none" }}
            >
              ＋ 新規経費申請
            </Link>
          </div>

          <div className="table-wrapper">
            <table className="list-table">
              <thead>
                <tr>
                  <th style={{ width: "120px" }}>日付</th>
                  <th style={{ width: "120px" }}>種別</th>
                  <th>経費名</th>
                  <th style={{ width: "100px" }}>金額</th>
                  <th style={{ width: "100px" }}>状態</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length > 0 ? (
                  expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>
                        <Link prefetch={true} href={`/expense-apply/confirm?expenseId=${expense.id}`}>
                          {expense.date}
                        </Link>
                      </td>
                      <td>
                        <div className="list-text-small" style={{ color: expense.type === "expenditure" ? "#c62828" : "#2e7d32" }}>
                          {expense.type === "expenditure" ? "支出" : "収入"} / {expense.category}
                        </div>
                      </td>
                      <td>
                        <div className="list-table-row-header">{expense.name}</div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>
                        ¥{expense.amount.toLocaleString()}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {getStatusBadge(expense.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-text">経費申請はまだありません🍀</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <style jsx>{`
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
