import React from "react";
import { 
  getExpenseApplyServer, 
  getPrefecturesServer 
} from "@/src/features/expense-apply/api/expense-apply-server-actions";
import { ExpenseApplyEditClient } from "@/src/features/expense-apply/views/edit/ExpenseApplyEditClient";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ mode?: string; expenseId?: string }>;
};

export default async function ExpenseEditPage({ searchParams }: Props) {
  const { mode, expenseId } = await searchParams;
  const isEdit = mode === "edit" || mode === "copy";

  const [initialData, prefectures] = await Promise.all([
    isEdit && expenseId ? getExpenseApplyServer(expenseId) : Promise.resolve(null),
    getPrefecturesServer(),
  ]);

  return (
    <ExpenseApplyEditClient 
      mode={(mode as any) || "new"} 
      expenseId={expenseId} 
      initialData={initialData} 
      prefectures={prefectures}
    />
  );
}
