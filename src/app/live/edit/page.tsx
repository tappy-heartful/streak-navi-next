import { getLiveServer } from "@/src/features/live/api/live-server-actions";
import { LiveEditClient } from "@/src/features/live/views/edit/LiveEditClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ mode?: string; liveId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { mode, liveId } = await searchParams;

  if (!mode || mode === "new" || !liveId) {
    return { title: mode === "edit" ? "ライブ編集" : "ライブ新規作成" };
  }

  const liveData = await getLiveServer(liveId);
  return {
    title: liveData ? `${liveData.title} | ライブ編集` : "ライブ編集",
  };
}

export default async function LiveEditPage({ searchParams }: Props) {
  const { mode, liveId } = await searchParams;

  const validModes = ["new", "edit", "copy"];
  if (!mode || !validModes.includes(mode)) notFound();

  const initialLive = liveId ? await getLiveServer(liveId) : null;

  if ((mode === "edit" || mode === "copy") && !initialLive) {
    notFound();
  }

  return (
    <LiveEditClient
      mode={mode as "new" | "edit" | "copy"}
      liveId={liveId}
      initialLive={initialLive}
    />
  );
}
