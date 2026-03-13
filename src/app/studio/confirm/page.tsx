import { getStudioServer, getPrefecturesServer } from "@/src/features/studio/api/studio-server-actions";
import { StudioConfirmClient } from "@/src/features/studio/views/confirm/StudioConfirmClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ studioId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { studioId } = await searchParams;
  if (!studioId) return { title: "スタジオ確認" };

  const studioData = await getStudioServer(studioId);
  return {
    title: studioData ? `${studioData.name} | スタジオ確認` : "スタジオ確認",
  };
}

export default async function StudioConfirmPage({ searchParams }: Props) {
  const { studioId } = await searchParams;

  if (!studioId) notFound();

  const [studioData, prefectures] = await Promise.all([
    getStudioServer(studioId),
    getPrefecturesServer(),
  ]);

  if (!studioData) notFound();

  return (
    <StudioConfirmClient
      studioData={studioData}
      studioId={studioId}
      prefectures={prefectures}
    />
  );
}
