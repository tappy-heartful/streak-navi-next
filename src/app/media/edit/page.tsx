import { getMediaServer } from "@/src/features/media/api/media-server-actions";
import { MediaEditClient } from "@/src/features/media/views/edit/MediaEditClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ mode?: string; mediaId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { mode, mediaId } = await searchParams;

  if (!mode || mode === "new" || !mediaId) {
    return { title: mode === "edit" ? "メディア編集" : "メディア新規作成" };
  }

  const mediaData = await getMediaServer(mediaId);
  return {
    title: mediaData ? `${mediaData.title} | メディア編集` : "メディア編集",
  };
}

export default async function MediaEditPage({ searchParams }: Props) {
  const { mode, mediaId } = await searchParams;

  const validModes = ["new", "edit", "copy"];
  if (!mode || !validModes.includes(mode)) notFound();

  const initialMedia = mediaId ? await getMediaServer(mediaId) : null;

  if ((mode === "edit" || mode === "copy") && !initialMedia) {
    notFound();
  }

  return (
    <MediaEditClient
      mode={mode as "new" | "edit" | "copy"}
      mediaId={mediaId}
      initialMedia={initialMedia}
    />
  );
}
