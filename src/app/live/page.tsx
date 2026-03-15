import { getLivesServer } from "@/src/features/live/api/live-server-actions";
import { LiveListClient } from "@/src/features/live/views/list/LiveListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ライブ一覧",
};

export default async function LiveListPage() {
  const lives = await getLivesServer();
  return <LiveListClient initialData={{ lives }} />;
}
