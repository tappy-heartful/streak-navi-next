/**
 * バランス会計 計算共通ロジック
 * 
 * 【計算規約】
 * 1. 経費・収入の集計:
 *    - 経費（支出）: 承認済み（status === "approved"）かつ !isIncome のもの
 *    - 収入: isIncome === true の経費申請 ＋ 団体収入（incomesコレクション）
 * 2. 端数切り上げ（Math.ceil）:
 *    - 基準負担額（averageBurden）= Math.ceil(netTotal / memberCount)
 *    - 割り切れなかった場合の端数余剰は送金を担う精算担当者（Manager）の手元に残り、
 *      自腹補填が発生しないよう設計。
 * 3. 精算額（settlementAmount）:
 *    - 個人立替拠出額（contribution）= 個人支出 - 個人収入
 *    - 支払/受取額 = averageBurden - contribution
 *    - 正の値: 支払うべき金額（未払い）
 *    - 負の値: 受け取るべき金額
 *    - 0: 精算不要
 */

export type AccountingSeasonKey = "spring" | "summer" | "autumn" | "winter";

export interface SeasonPeriod {
  start: string; // "yyyy.MM.dd"
  end: string;   // "yyyy.MM.dd"
}

/**
 * 年とシーズンキーから期間（開始日・終了日）を取得
 */
export function getSeasonPeriod(year: number, seasonKey: AccountingSeasonKey): SeasonPeriod {
  const ranges: Record<AccountingSeasonKey, SeasonPeriod> = {
    winter: { start: `${year}.01.01`, end: `${year}.03.31` },
    spring: { start: `${year}.04.01`, end: `${year}.06.30` },
    summer: { start: `${year}.07.01`, end: `${year}.09.30` },
    autumn: { start: `${year}.10.01`, end: `${year}.12.31` }
  };
  return ranges[seasonKey];
}

export interface BalanceTotals {
  totalExpenses: number;
  totalIncomes: number;
  netTotal: number;
  memberCount: number;
  averageBurden: number;
}

export interface MemberBalanceCalculation {
  uid: string;
  expenses: number;
  incomes: number;
  contribution: number; // expenses - incomes
  settlementAmount: number; // averageBurden - contribution
  isPayer: boolean; // settlementAmount > 0
  isReceiver: boolean; // settlementAmount < 0
  isZero: boolean; // settlementAmount === 0
}

export interface BalanceCalculationResult {
  totals: BalanceTotals;
  memberCalculations: Record<string, MemberBalanceCalculation>;
  membersList: MemberBalanceCalculation[];
}

export interface ExpenseItemLike {
  uid: string;
  amount: number | string;
  isIncome?: boolean;
}

export interface IncomeItemLike {
  uid: string;
  amount: number | string;
}

/**
 * バランス会計の全体集計および各メンバーの精算額を一括計算
 */
export function calculateBalanceAccounting(
  memberIds: string[],
  expenses: ExpenseItemLike[],
  incomes: IncomeItemLike[]
): BalanceCalculationResult {
  const activeMemberIds = Array.from(new Set((memberIds || []).filter(Boolean)));
  const memberSet = new Set(activeMemberIds);

  // 1. 全体集計（対象メンバーに紐づく経費・収入）
  const totalExpenses = expenses
    .filter(e => memberSet.has(e.uid) && !e.isIncome)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const totalIncomes = expenses
    .filter(e => memberSet.has(e.uid) && e.isIncome)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0) +
    incomes
      .filter(i => memberSet.has(i.uid))
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const netTotal = totalExpenses - totalIncomes;
  const memberCount = activeMemberIds.length;
  const averageBurden = memberCount > 0 ? Math.ceil(netTotal / memberCount) : 0;

  // 2. 各メンバーの精算額計算
  const memberCalculations: Record<string, MemberBalanceCalculation> = {};
  const membersList: MemberBalanceCalculation[] = [];

  activeMemberIds.forEach(uid => {
    const userExpenses = expenses
      .filter(e => e.uid === uid && !e.isIncome)
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    const userIncomes = expenses
      .filter(e => e.uid === uid && e.isIncome)
      .reduce((s, e) => s + Number(e.amount || 0), 0) +
      incomes
        .filter(i => i.uid === uid)
        .reduce((s, i) => s + Number(i.amount || 0), 0);

    const contribution = userExpenses - userIncomes;
    const settlementAmount = averageBurden - contribution;

    const calc: MemberBalanceCalculation = {
      uid,
      expenses: userExpenses,
      incomes: userIncomes,
      contribution,
      settlementAmount,
      isPayer: settlementAmount > 0,
      isReceiver: settlementAmount < 0,
      isZero: settlementAmount === 0,
    };

    memberCalculations[uid] = calc;
    membersList.push(calc);
  });

  return {
    totals: {
      totalExpenses,
      totalIncomes,
      netTotal,
      memberCount,
      averageBurden,
    },
    memberCalculations,
    membersList,
  };
}

/**
 * 特定個人の精算額を計算（シーズン対象外メンバーの場合は averageBurden = 0）
 */
export function calculatePersonalBalance(
  uid: string,
  averageBurden: number,
  isTarget: boolean,
  expenses: ExpenseItemLike[],
  incomes: IncomeItemLike[]
) {
  const myExpenses = expenses
    .filter(e => e.uid === uid && !e.isIncome)
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const myIncomes = expenses
    .filter(e => e.uid === uid && e.isIncome)
    .reduce((s, e) => s + Number(e.amount || 0), 0) +
    incomes
      .filter(i => i.uid === uid)
      .reduce((s, i) => s + Number(i.amount || 0), 0);

  const myContribution = myExpenses - myIncomes;
  const settlementAmount = (isTarget ? averageBurden : 0) - myContribution;

  return {
    myExpenses,
    myIncomes,
    myContribution,
    isTarget,
    settlementAmount,
  };
}

