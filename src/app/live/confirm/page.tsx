import { getLiveServer } from "@/src/features/live/api/live-server-actions";
import { LiveConfirmClient } from "@/src/features/live/views/confirm/LiveConfirmClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ liveId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { liveId } = await searchParams;
  if (!liveId) return { title: "ライブ確認" };

  const liveData = await getLiveServer(liveId);
  return {
    title: liveData ? `${liveData.title} | ライブ確認` : "ライブ確認",
  };
}

export const dynamic = "force-dynamic";

export default async function LiveConfirmPage({ searchParams }: Props) {
  const { liveId } = await searchParams;

  if (!liveId) notFound();

  const liveData = await getLiveServer(liveId);
  if (!liveData) notFound();

  return <LiveConfirmClient liveData={liveData} liveId={liveId} />;
}
