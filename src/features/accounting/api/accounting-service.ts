import admin from "firebase-admin";
import { adminDb } from "@/src/lib/firebase-admin";
import { toPlainObject } from "@/src/lib/firestore/utils";
import {
  AccountingSeason,
  AccountingConfig,
  ExpenseApply,
  Income,
  User,
  AccountingSeasonKey
} from "@/src/lib/firestore/types";
import * as utils from "@/src/lib/functions";

/**
 * 会計設定を取得
 */
export async function getAccountingConfigServer() {
  const doc = await adminDb.collection("configs").doc("accounting").get();
  if (!doc.exists) {
    // デフォルト値を返すか、初期化が必要
    return {
      id: "accounting",
      seasons: {
        winter: { name: "冬", startMonth: 1, endMonth: 3 },
        spring: { name: "春", startMonth: 4, endMonth: 6 },
        summer: { name: "夏", startMonth: 7, endMonth: 9 },
        autumn: { name: "秋", startMonth: 10, endMonth: 12 },
      }
    } as AccountingConfig;
  }
  return toPlainObject(doc) as AccountingConfig;
}

/**
 * 指定した年・シーズンの情報を取得
 */
export async function getAccountingSeasonServer(year: number, seasonKey: AccountingSeasonKey) {
  const seasonId = `${year}-${seasonKey}`;
  const doc = await adminDb.collection("accountingSeasons").doc(seasonId).get();
  if (!doc.exists) return null;
  return toPlainObject(doc) as AccountingSeason;
}

/**
 * 現在のシーズン情報を取得
 */
export async function getCurrentAccountingSeasonServer() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  let seasonKey: AccountingSeasonKey = "winter";
  if (month >= 4 && month <= 6) seasonKey = "spring";
  else if (month >= 7 && month <= 9) seasonKey = "summer";
  else if (month >= 10 && month <= 12) seasonKey = "autumn";

  return await getAccountingSeasonServer(year, seasonKey);
}

/**
 * 特定期間の承認済み経費を取得
 */
export async function getApprovedExpensesServer(startDate: string, endDate: string) {
  const startMs = new Date(startDate.replace(/\./g, "/") + " 00:00:00").getTime();
  const endMs = new Date(endDate.replace(/\./g, "/") + " 23:59:59.999").getTime();

  const startTimestamp = admin.firestore.Timestamp.fromMillis(startMs);
  const endTimestamp = admin.firestore.Timestamp.fromMillis(endMs);

  const snap = await adminDb.collection("expenseApplies")
    .where("createdAt", ">=", startTimestamp)
    .where("createdAt", "<=", endTimestamp)
    .get();

  return snap.docs
    .map(toPlainObject)
    .filter((e: any) => e.status === "approved") as ExpenseApply[];
}

/**
 * 特定期間の収入を取得
 */
export async function getIncomesServer(startDate: string, endDate: string) {
  const startMs = new Date(startDate.replace(/\./g, "/") + " 00:00:00").getTime();
  const endMs = new Date(endDate.replace(/\./g, "/") + " 23:59:59.999").getTime();

  const snap = await adminDb.collection("incomes")
    .where("createdAt", ">=", startMs)
    .where("createdAt", "<=", endMs)
    .get();

  return snap.docs.map(toPlainObject) as Income[];
}

/**
 * 会計対象のユーザー一覧を取得
 */
export async function getAccountingUsersServer() {
  const snap = await adminDb.collection("users").get();
  return snap.docs.map(toPlainObject) as User[];
}

/**
 * ホーム画面表示用の個人精算サマリーを取得
 */
export async function getPersonalSettlementSummaryServer(userId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let seasonKey: AccountingSeasonKey = "winter";
  if (month >= 4 && month <= 6) seasonKey = "spring";
  else if (month >= 7 && month <= 9) seasonKey = "summer";
  else if (month >= 10 && month <= 12) seasonKey = "autumn";

  // 期間の算出 (1-3, 4-6, 7-9, 10-12)
  const ranges = {
    winter: { start: `${year}.01.01`, end: `${year}.03.31` },
    spring: { start: `${year}.04.01`, end: `${year}.06.30` },
    summer: { start: `${year}.07.01`, end: `${year}.09.30` },
    autumn: { start: `${year}.10.01`, end: `${year}.12.31` },
  };
  const range = ranges[seasonKey];

   const [config, season] = await Promise.all([
     getAccountingConfigServer(),
     getAccountingSeasonServer(year, seasonKey)
   ]);

   if (!season) return null;

   const seasonInfo = config.seasons[seasonKey];
   const seasonName = `${year}年 ${seasonInfo.name}シーズン`;
   const periodStr = `${seasonInfo.startMonth}月〜${seasonInfo.endMonth}月`;

   const expenses = await getApprovedExpensesServer(range.start, range.end);
  const incomes = await getIncomesServer(range.start, range.end);

  const activeMemberIds = season.memberIds || [];

  // 全体集計
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalIncomes = incomes
    .filter(i => activeMemberIds.includes(i.uid))
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const netTotal = totalExpenses - totalIncomes;
  const memberCount = activeMemberIds.length;
  const averageBurden = memberCount > 0 ? Math.floor(netTotal / memberCount) : 0;

  // 個人の計算
  const myExpenses = expenses
    .filter(e => e.uid === userId)
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const myIncomes = incomes
    .filter(i => i.uid === userId)
    .reduce((s, i) => s + Number(i.amount || 0), 0);

  const myContribution = myExpenses - myIncomes;
  const isTarget = activeMemberIds.includes(userId);
  const settlementAmount = (isTarget ? averageBurden : 0) - myContribution;

  return {
     season,
     seasonName,
     periodStr,
     averageBurden,
     myExpenses,
     myIncomes,
     settlementAmount,
     isTarget
   };
}
