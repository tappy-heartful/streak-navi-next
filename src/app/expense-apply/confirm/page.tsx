import React from "react";
import { 
  getExpenseApplyServer, 
  getPrefecturesServer,
  getExpenseHistoryServer 
} from "@/src/features/expense-apply/api/expense-apply-server-actions";
import { getMunicipalityNamesMapServer } from "@/src/features/users/api/user-server-actions";
import { ExpenseApplyConfirmClient } from "@/src/features/expense-apply/views/confirm/ExpenseApplyConfirmClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ expenseId?: string }>;
};

export default async function ExpenseConfirmPage({ searchParams }: Props) {
  const { expenseId } = await searchParams;
  if (!expenseId) notFound();

  const [expense, prefectures, history] = await Promise.all([
    getExpenseApplyServer(expenseId),
    getPrefecturesServer(),
    getExpenseHistoryServer(expenseId),
  ]);

  if (!expense) notFound();

  // 市区町村名のマップを取得
  const munIds = new Set<string>();
  if (expense.departureMunicipalityId) munIds.add(expense.departureMunicipalityId);
  if (expense.arrivalMunicipalityId) munIds.add(expense.arrivalMunicipalityId);
  const munNamesMap = await getMunicipalityNamesMapServer([...munIds]);

  return (
    <ExpenseApplyConfirmClient 
      expenseId={expenseId} 
      initialData={expense} 
      prefectures={prefectures}
      municipalityNames={munNamesMap}
      history={history}
    />
  );
}
