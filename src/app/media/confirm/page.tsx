import { getMediaServer } from "@/src/features/media/api/media-server-actions";
import { MediaConfirmClient } from "@/src/features/media/views/confirm/MediaConfirmClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ mediaId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { mediaId } = await searchParams;
  if (!mediaId) return { title: "メディア確認" };

  const mediaData = await getMediaServer(mediaId);
  return {
    title: mediaData ? `${mediaData.title} | メディア確認` : "メディア確認",
  };
}

export default async function MediaConfirmPage({ searchParams }: Props) {
  const { mediaId } = await searchParams;

  if (!mediaId) notFound();

  const mediaData = await getMediaServer(mediaId);
  if (!mediaData) notFound();

  return (
    <MediaConfirmClient mediaData={mediaData} mediaId={mediaId} />
  );
}
