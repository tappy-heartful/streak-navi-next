import { getStudioServer, getPrefecturesServer } from "@/src/features/studio/api/studio-server-actions";
import { StudioEditClient } from "@/src/features/studio/views/edit/StudioEditClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ mode?: string; studioId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { mode, studioId } = await searchParams;

  if (!mode || mode === "new" || !studioId) {
    return { title: mode === "edit" ? "スタジオ編集" : "スタジオ新規作成" };
  }

  const studioData = await getStudioServer(studioId);
  return {
    title: studioData ? `${studioData.name} | スタジオ編集` : "スタジオ編集",
  };
}

export const dynamic = "force-dynamic";

export default async function StudioEditPage({ searchParams }: Props) {
  const { mode, studioId } = await searchParams;

  const validModes = ["new", "edit", "copy"];
  if (!mode || !validModes.includes(mode)) notFound();

  const [initialStudio, prefectures] = await Promise.all([
    studioId ? getStudioServer(studioId) : null,
    getPrefecturesServer(),
  ]);

  if ((mode === "edit" || mode === "copy") && !initialStudio) {
    notFound();
  }

  return (
    <StudioEditClient
      mode={mode as "new" | "edit" | "copy"}
      studioId={studioId}
      initialStudio={initialStudio}
      prefectures={prefectures}
    />
  );
}
