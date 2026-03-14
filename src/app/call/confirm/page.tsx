import { getCallServer, getCallConfirmDataServer } from "@/src/features/call/api/call-server-actions";
import { CallConfirmClient } from "@/src/features/call/views/confirm/CallConfirmClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ callId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { callId } = await searchParams;
  if (!callId) return { title: "曲募集確認" };

  const callData = await getCallServer(callId);
  return {
    title: callData ? `${callData.title} | 曲募集確認` : "曲募集確認",
  };
}

export default async function CallConfirmPage({ searchParams }: Props) {
  const { callId } = await searchParams;

  if (!callId) notFound();

  const [callData, confirmData] = await Promise.all([
    getCallServer(callId),
    getCallConfirmDataServer(callId),
  ]);

  if (!callData) notFound();

  return (
    <CallConfirmClient
      callData={callData}
      callId={callId}
      callAnswers={confirmData.callAnswers}
      usersMap={confirmData.usersMap}
      scoreStatusMap={confirmData.scoreStatusMap}
    />
  );
}
