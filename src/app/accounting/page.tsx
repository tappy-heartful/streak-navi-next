import { 
  getAccountingConfigServer, 
  getAccountingSeasonServer, 
  getApprovedExpensesServer, 
  getIncomesServer,
  getAccountingUsersServer
} from "@/src/features/accounting/api/accounting-service";
import { getSectionsServer, getRolesServer } from "@/src/features/users/api/user-server-actions";
import { BalanceAccountingClient } from "@/src/features/accounting/views/BalanceAccountingClient";
import { AccountingSeasonKey } from "@/src/lib/firestore/types";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "バランス会計 | Streak Navi",
};

export default async function BalanceAccountingPage() {
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

  const [config, season, expenses, incomes, users, sections, roles] = await Promise.all([
    getAccountingConfigServer(),
    getAccountingSeasonServer(year, seasonKey),
    getApprovedExpensesServer(range.start, range.end),
    getIncomesServer(range.start, range.end),
    getAccountingUsersServer(),
    getSectionsServer(),
    getRolesServer(),
  ]);

  return (
    <BalanceAccountingClient 
      initialData={{
        config,
        season,
        expenses,
        incomes,
        users,
        sections,
        roles,
        year,
        seasonKey
      }}
    />
  );
}

