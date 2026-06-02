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
 * 指定したIDのシーズン情報を取得
 */
export async function getAccountingSeasonByIdServer(id: string) {
  const doc = await adminDb.collection("accountingSeasons").doc(id).get();
  if (!doc.exists) return null;
  return toPlainObject(doc) as AccountingSeason;
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

  const [expenseSnap, typeSnap] = await Promise.all([
    adminDb.collection("expenseApplies")
      .where("createdAt", ">=", startTimestamp)
      .where("createdAt", "<=", endTimestamp)
      .get(),
    adminDb.collection("expenseTypes").get()
  ]);

  const incomeTypeIds = typeSnap.docs
    .filter(doc => doc.data().isIncome === true)
    .map(doc => doc.id);

  return expenseSnap.docs
    .map(doc => {
      const data = toPlainObject(doc) as any;
      // isIncomeフラグを付与（expenseTypeId または typeId で判定）
      const typeId = data.expenseTypeId || data.typeId;
      data.isIncome = incomeTypeIds.includes(typeId);
      return data;
    })
    .filter((e: any) => e.status === "approved") as (ExpenseApply & { isIncome: boolean })[];
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
 * 全会計シーズン情報を取得（作成日時降順）
 * 2026年冬（2026-winter）以降、かつ現シーズンまでのものを表示対象とする
 */
export async function getAccountingSeasonsServer() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let currentSeasonKey: AccountingSeasonKey = "winter";
  if (month >= 4 && month <= 6) currentSeasonKey = "spring";
  else if (month >= 7 && month <= 9) currentSeasonKey = "summer";
  else if (month >= 10 && month <= 12) currentSeasonKey = "autumn";

  const snap = await adminDb.collection("accountingSeasons").orderBy("createdAt", "desc").get();
  const seasons = snap.docs.map(toPlainObject) as AccountingSeason[];

  const seasonOrder: Record<AccountingSeasonKey, number> = {
    winter: 1,
    spring: 2,
    summer: 3,
    autumn: 4
  };

  return seasons.filter(s => {
    // 2026年冬以降であることをチェック
    if (s.year < 2026) return false;
    // 2026年の場合、winter以降（すべてOKだが明示的に）

    // 未来のシーズンでないことをチェック
    if (s.year > year) return false;
    if (s.year === year) {
      if (seasonOrder[s.seasonKey] > seasonOrder[currentSeasonKey]) return false;
    }

    return true;
  });
}

/**
 * 特定の会計シーズンの精算サマリーを計算するヘルパー関数
 */
async function calculateSeasonSummary(userId: string, season: AccountingSeason, config: any) {
  const { year, seasonKey } = season;
  const ranges = {
    winter: { start: `${year}.01.01`, end: `${year}.03.31` },
    spring: { start: `${year}.04.01`, end: `${year}.06.30` },
    summer: { start: `${year}.07.01`, end: `${year}.09.30` },
    autumn: { start: `${year}.10.01`, end: `${year}.12.31` },
  };
  const range = ranges[seasonKey];

  // 担当者情報を取得
  let managerName = "";
  let managerPaypayId = "";
  if (season.managerId) {
    const managerDoc = await adminDb.collection("users").doc(season.managerId).get();
    if (managerDoc.exists) {
      const managerData = managerDoc.data();
      managerName = managerData?.displayName || "";
      managerPaypayId = managerData?.paypayId || "";
    }
  }

  const seasonInfo = config.seasons[seasonKey];
  const seasonName = `${year}年 ${seasonInfo.name}シーズン`;
  const settlementMonth = seasonInfo.endMonth === 12 ? 1 : seasonInfo.endMonth + 1;
  const periodStr = `${seasonInfo.startMonth}月〜${seasonInfo.endMonth}月（精算: ${settlementMonth}月）`;

  const expenses = await getApprovedExpensesServer(range.start, range.end);
  const incomes = await getIncomesServer(range.start, range.end);

  const activeMemberIds = season.memberIds || [];

  // 全体集計
  const totalExpenses = expenses
    .filter(e => !e.isIncome)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalIncomes = expenses
    .filter(e => e.isIncome)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0) +
    incomes
      .filter(i => activeMemberIds.includes(i.uid))
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const netTotal = totalExpenses - totalIncomes;
  const memberCount = activeMemberIds.length;
  const averageBurden = memberCount > 0 ? Math.floor(netTotal / memberCount) : 0;

  // 個人の計算
  const myExpenses = expenses
    .filter(e => e.uid === userId && !e.isIncome)
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const myIncomes = expenses
    .filter(e => e.uid === userId && e.isIncome)
    .reduce((s, e) => s + Number(e.amount || 0), 0) +
    incomes
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
    isTarget,
    managerName,
    managerPaypayId
  };
}

/**
 * ホーム画面表示用の個人精算サマリーを取得（最新の現行シーズン＋過去の未払いシーズン）
 */
export async function getPersonalSettlementSummaryServer(userId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let currentSeasonKey: AccountingSeasonKey = "winter";
  if (month >= 4 && month <= 6) currentSeasonKey = "spring";
  else if (month >= 7 && month <= 9) currentSeasonKey = "summer";
  else if (month >= 10 && month <= 12) currentSeasonKey = "autumn";

  const currentSeasonId = `${year}-${currentSeasonKey}`;

  // すべてのシーズン情報を並行取得
  const [config, seasonsSnap] = await Promise.all([
    getAccountingConfigServer(),
    adminDb.collection("accountingSeasons").get()
  ]);

  const allSeasons = seasonsSnap.docs.map(toPlainObject) as AccountingSeason[];

  // 1. 現行シーズンの計算
  const currentSeason = allSeasons.find(s => s.id === currentSeasonId);
  let currentSummary = null;
  if (currentSeason) {
    currentSummary = await calculateSeasonSummary(userId, currentSeason, config);
  }

  // 2. 過去の未精算シーズンを収集
  const unpaidPast = [];
  const pastSeasons = allSeasons.filter(s => s.id !== currentSeasonId);

  for (const s of pastSeasons) {
    const isTarget = s.memberIds?.includes(userId);
    if (!isTarget) continue;

    // 既に支払証明・受取証明の写真が登録済みなら完了とみなす
    const hasEvidence = s.evidenceUrls && s.evidenceUrls[userId] && s.evidenceUrls[userId].trim() !== "";
    if (hasEvidence) continue;

    const summary = await calculateSeasonSummary(userId, s, config);
    // 精算額が0（支払も受取もない）の場合はスキップ
    if (summary.settlementAmount === 0) continue;

    unpaidPast.push(summary);
  }

  // 過去の未払いシーズンを新しい順にソート
  unpaidPast.sort((a, b) => b.season.id.localeCompare(a.season.id));

  return {
    current: currentSummary,
    unpaidPast: unpaidPast
  };
}
