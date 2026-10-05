import { getLiveServer, fetchLiveEditData } from "@/src/features/live/api/live-server-actions";
import { LiveEditClient } from "@/src/features/live/views/edit/LiveEditClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ mode?: string; liveId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { mode, liveId } = await searchParams;

  if (!mode || mode === "new" || !liveId) {
    return { title: "ライブ新規登録" };
  }

  const liveData = await getLiveServer(liveId);
  return {
    title: liveData?.title ? `${liveData.title} - ライブ編集` : "ライブ編集",
  };
}

export const dynamic = "force-dynamic";

export default async function LiveEditPage({ searchParams }: Props) {
  const { mode, liveId } = await searchParams;

  const validModes = ["new", "edit", "copy"];
  if (!mode || !validModes.includes(mode)) notFound();

  const [initialLive, editData] = await Promise.all([
    liveId ? getLiveServer(liveId) : Promise.resolve(null),
    fetchLiveEditData()
  ]);

  if ((mode === "edit" || mode === "copy") && !initialLive) {
    notFound();
  }

  const { scores } = editData;

  return (
    <LiveEditClient
      mode={mode as "new" | "edit" | "copy"}
      liveId={liveId}
      initialLive={initialLive}
      scores={scores}
    />
  );
}
