import { 
  getAccountingConfigServer, 
  getAccountingSeasonsServer,
  getAccountingSeasonServer
} from "@/src/features/accounting/api/accounting-service";
import { AccountingListClient } from "@/src/features/accounting/views/list/AccountingListClient";
import { AccountingSeasonKey } from "@/src/lib/firestore/types";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "バランス会計一覧 | Streak Navi",
};

export const dynamic = "force-dynamic";

export default async function AccountingListPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let seasonKey: AccountingSeasonKey = "winter";
  if (month >= 4 && month <= 6) seasonKey = "spring";
  else if (month >= 7 && month <= 9) seasonKey = "summer";
  else if (month >= 10 && month <= 12) seasonKey = "autumn";

  const [seasons, config, currentSeason] = await Promise.all([
    getAccountingSeasonsServer(),
    getAccountingConfigServer(),
    getAccountingSeasonServer(year, seasonKey)
  ]);

  return (
    <AccountingListClient 
      initialData={{
        seasons,
        config,
        canInitialize: !currentSeason
      }}
    />
  );
}
