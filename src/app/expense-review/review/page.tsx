import React from "react";
import { 
  getExpenseApplyServer, 
  getPrefecturesServer 
} from "@/src/features/expense-apply/api/expense-apply-server-actions";
import { getMunicipalityNamesMapServer, getUserServer } from "@/src/features/users/api/user-server-actions";
import { ExpenseReviewClient } from "@/src/features/expense-review/views/review/ExpenseReviewClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ expenseId?: string }>;
};

export default async function ExpenseReviewPage({ searchParams }: Props) {
  const { expenseId } = await searchParams;
  if (!expenseId) notFound();

  const expense = await getExpenseApplyServer(expenseId);
  if (!expense) notFound();

  const [prefectures, applicant] = await Promise.all([
    getPrefecturesServer(),
    getUserServer(expense.uid)
  ]);

  // 市区町村名のマップを取得
  const munIds = new Set<string>();
  if (expense.departureMunicipalityId) munIds.add(expense.departureMunicipalityId);
  if (expense.arrivalMunicipalityId) munIds.add(expense.arrivalMunicipalityId);
  const munNamesMap = await getMunicipalityNamesMapServer([...munIds]);

  return (
    <ExpenseReviewClient 
      expenseId={expenseId} 
      initialData={expense} 
      prefectures={prefectures}
      municipalityNamesMap={munNamesMap}
      applicantName={applicant?.displayName || "不明"}
    />
  );
}
