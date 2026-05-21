import {
  getAccountingConfigServer,
  getAccountingSeasonsServer
} from "@/src/features/accounting/api/accounting-service";
import { AccountingListClient } from "@/src/features/accounting/views/list/AccountingListClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "バランス会計一覧 | Streak Navi",
};

export const dynamic = "force-dynamic";

export default async function AccountingListPage() {
  const [seasons, config] = await Promise.all([
    getAccountingSeasonsServer(),
    getAccountingConfigServer()
  ]);

  return (
    <AccountingListClient
      initialData={{
        seasons,
        config
      }}
    />
  );
}
