import { getCallsServer, getCallAnswerIdsServer } from "@/src/features/call/api/call-server-actions";
import { CallListClient } from "@/src/features/call/views/list/CallListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "曲募集一覧",
};

export const dynamic = "force-dynamic";

export default async function CallListPage() {
  const [calls, callAnswerIds] = await Promise.all([
    getCallsServer(),
    getCallAnswerIdsServer(),
  ]);

  return (
    <CallListClient initialData={{ calls, callAnswerIds }} />
  );
}
