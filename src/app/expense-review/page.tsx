import React from "react";
import { getAllExpenseAppliesServer } from "@/src/features/expense-apply/api/expense-apply-server-actions";
import { getUsersServer } from "@/src/features/users/api/user-server-actions";
import { ExpenseReviewListClient } from "@/src/features/expense-review/views/list/ExpenseReviewListClient";

export const dynamic = "force-dynamic";

export default async function ExpenseReviewPage() {
  const [expenses, users] = await Promise.all([
    getAllExpenseAppliesServer(),
    getUsersServer(),
  ]);

  const usersMap: Record<string, string> = {};
  users.forEach(u => {
    usersMap[u.id] = u.displayName || "匿名";
  });

  return <ExpenseReviewListClient initialExpenses={expenses} usersMap={usersMap} />;
}
