import { getStudiosServer, getPrefecturesServer } from "@/src/features/studio/api/studio-server-actions";
import { StudioListClient } from "@/src/features/studio/views/list/StudioListClient";
import { getMunicipalityNamesMapServer } from "@/src/features/users/api/user-server-actions";
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

  const municipalityIds = Array.from(
    new Set(studios.map(s => s.municipality).filter((id): id is string => !!id))
  );
  const municipalityNamesMap = await getMunicipalityNamesMapServer(municipalityIds);

  return (
    <StudioListClient initialData={{ studios, prefectures, municipalityNamesMap }} />
  );
}
