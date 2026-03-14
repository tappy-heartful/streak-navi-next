import { getCallServer, getScoreStatusesServer } from "@/src/features/call/api/call-server-actions";
import { CallAnswerClient } from "@/src/features/call/views/answer/CallAnswerClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ callId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { callId } = await searchParams;
  if (!callId) return { title: "回答登録" };

  const callData = await getCallServer(callId);
  return {
    title: callData ? `${callData.title} | 回答登録` : "回答登録",
  };
}

export default async function CallAnswerPage({ searchParams }: Props) {
  const { callId } = await searchParams;

  if (!callId) notFound();

  const [callData, scoreStatuses] = await Promise.all([
    getCallServer(callId),
    getScoreStatusesServer(),
  ]);

  if (!callData) notFound();

  return (
    <CallAnswerClient
      callData={callData}
      callId={callId}
      scoreStatuses={scoreStatuses}
    />
  );
}
