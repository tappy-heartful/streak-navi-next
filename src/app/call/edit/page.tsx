import { getCallServer } from "@/src/features/call/api/call-server-actions";
import { CallEditClient } from "@/src/features/call/views/edit/CallEditClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ mode?: string; callId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { mode, callId } = await searchParams;

  if (!mode || mode === "new" || !callId) {
    return { title: mode === "edit" ? "曲募集編集" : "曲募集新規作成" };
  }

  const callData = await getCallServer(callId);
  return {
    title: callData ? `${callData.title} | 曲募集編集` : "曲募集編集",
  };
}

export const dynamic = "force-dynamic";

export default async function CallEditPage({ searchParams }: Props) {
  const { mode, callId } = await searchParams;

  const validModes = ["new", "edit", "copy"];
  if (!mode || !validModes.includes(mode)) notFound();

  const initialCall = callId ? await getCallServer(callId) : null;

  if ((mode === "edit" || mode === "copy") && !initialCall) {
    notFound();
  }

  return (
    <CallEditClient
      mode={mode as "new" | "edit" | "copy"}
      callId={callId}
      initialCall={initialCall}
    />
  );
}
