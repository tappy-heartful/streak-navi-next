import {
  getAccountingConfigServer,
  getAccountingSeasonsServer
} from "@/src/features/accounting/api/accounting-service";
import { AccountingListClient } from "@/src/features/accounting/views/list/AccountingListClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "バランス会計一覧 | Streak Navi",
};

// 1分間キャッシュ
export const revalidate = 60;

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
