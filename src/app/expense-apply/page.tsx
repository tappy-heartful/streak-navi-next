import React from "react";
import { ExpenseApplyListClient } from "@/src/features/expense-apply/views/list/ExpenseApplyListClient";

export const dynamic = "force-dynamic";

export default async function ExpenseListPage() {
  // SSRではUIDを取得できないため、Client側でfetchするように実装
  return <ExpenseApplyListClient initialExpenses={[]} />;
}
