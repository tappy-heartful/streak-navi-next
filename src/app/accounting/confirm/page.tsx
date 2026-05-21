import {
  getAccountingConfigServer,
  getAccountingSeasonByIdServer,
  getApprovedExpensesServer,
  getIncomesServer,
  getAccountingUsersServer
} from "@/src/features/accounting/api/accounting-service";
import { getSectionsServer, getRolesServer } from "@/src/features/users/api/user-server-actions";
import { AccountingConfirmClient } from "@/src/features/accounting/views/confirm/AccountingConfirmClient";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "バランス会計確認 | Streak Navi",
};

export const dynamic = "force-dynamic";

export default async function AccountingConfirmPage({ searchParams }: { searchParams: Promise<{ seasonId?: string }> }) {
  const resolvedParams = await searchParams;
  const seasonId = resolvedParams.seasonId;

  if (!seasonId) {
    notFound();
  }

  const season = await getAccountingSeasonByIdServer(seasonId);
  if (!season) {
    notFound();
  }

  const year = season.year;
  const seasonKey = season.seasonKey;

  // 期間の算出 (1-3, 4-6, 7-9, 10-12)
  const ranges = {
    winter: { start: `${year}.01.01`, end: `${year}.03.31` },
    spring: { start: `${year}.04.01`, end: `${year}.06.30` },
    summer: { start: `${year}.07.01`, end: `${year}.09.30` },
    autumn: { start: `${year}.10.01`, end: `${year}.12.31` },
  };
  const range = ranges[seasonKey];

  const [config, expenses, incomes, users, sections, roles] = await Promise.all([
    getAccountingConfigServer(),
    getApprovedExpensesServer(range.start, range.end),
    getIncomesServer(range.start, range.end),
    getAccountingUsersServer(),
    getSectionsServer(),
    getRolesServer(),
  ]);

  return (
    <AccountingConfirmClient
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
