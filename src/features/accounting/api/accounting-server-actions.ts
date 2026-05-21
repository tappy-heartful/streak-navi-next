"use server";

import { adminDb } from "@/src/lib/firebase-admin";
import { AccountingSeason, Income, AccountingSeasonKey } from "@/src/lib/firestore/types";
import { revalidatePath } from "next/cache";
import { getPersonalSettlementSummaryServer, getAccountingSeasonServer } from "./accounting-service";

/**
 * 今シーズンの会計を初期化する
 */
export async function initializeCurrentSeasonAction() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let seasonKey: AccountingSeasonKey = "winter";
  if (month >= 4 && month <= 6) seasonKey = "spring";
  else if (month >= 7 && month <= 9) seasonKey = "summer";
  else if (month >= 10 && month <= 12) seasonKey = "autumn";

  const seasonId = `${year}-${seasonKey}`;
  const existing = await getAccountingSeasonServer(year, seasonKey);

  if (!existing) {
    await adminDb.collection("accountingSeasons").doc(seasonId).set({
      id: seasonId,
      year,
      seasonKey,
      memberIds: [],
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    revalidatePath("/accounting");
  }

  return seasonId;
}

/**
 * 個人精算サマリーを取得（サーバーアクション）
 */
export async function getPersonalSettlementSummaryAction(userId: string) {
  return await getPersonalSettlementSummaryServer(userId);
}

/**
 * 会計シーズンの情報を更新・作成（サーバーサイド）
 */
export async function saveAccountingSeasonAction(season: Partial<AccountingSeason> & { id: string }) {
  const docRef = adminDb.collection("accountingSeasons").doc(season.id);
  await docRef.set({
    ...season,
    updatedAt: Date.now(),
    createdAt: season.createdAt || Date.now()
  }, { merge: true });

  revalidatePath("/accounting");
}

/**
 * 収入を登録（サーバーサイド）
 */
export async function addIncomeAction(data: Omit<Income, "id" | "createdAt" | "updatedAt">) {
  const colRef = adminDb.collection("incomes");
  await colRef.add({
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  revalidatePath("/accounting");
}

/**
 * 収入を更新（サーバーサイド）
 */
export async function updateIncomeAction(id: string, data: Partial<Income>) {
  const docRef = adminDb.collection("incomes").doc(id);
  await docRef.update({
    ...data,
    updatedAt: Date.now()
  });

  revalidatePath("/accounting");
}

/**
 * 収入を削除（サーバーサイド）
 */
export async function deleteIncomeAction(id: string) {
  const docRef = adminDb.collection("incomes").doc(id);
  await docRef.delete();

  revalidatePath("/accounting");
}
