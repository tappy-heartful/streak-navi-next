import { getStudiosServer, getPrefecturesServer } from "@/src/features/studio/api/studio-server-actions";
import { StudioListClient } from "@/src/features/studio/views/list/StudioListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "スタジオ一覧",
};

export const dynamic = "force-dynamic";

export default async function StudioListPage() {
  const [studios, prefectures] = await Promise.all([
    getStudiosServer(),
    getPrefecturesServer(),
  ]);

  return (
    <StudioListClient initialData={{ studios, prefectures }} />
  );
}
