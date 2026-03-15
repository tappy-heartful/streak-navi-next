import { getMediasServer } from "@/src/features/media/api/media-server-actions";
import { MediaListClient } from "@/src/features/media/views/list/MediaListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "メディア一覧",
};

export default async function MediaListPage() {
  const medias = await getMediasServer();

  return (
    <MediaListClient initialData={{ medias }} />
  );
}
