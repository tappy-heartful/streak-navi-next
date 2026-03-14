import { notFound } from "next/navigation";
import { fetchVote } from "@/src/features/vote/api/vote-server-actions";
import { VoteEditClient } from "@/src/features/vote/views/edit/VoteEditClient";
import { adminDb as db } from "@/src/lib/firebase-admin";
import { Vote, Call } from "@/src/lib/firestore/types";

export const metadata = { title: "投票管理" };
export const dynamic = 'force-dynamic';

export default async function VoteEditPage({ searchParams }: { searchParams: Promise<{ mode?: string; voteId?: string; callId?: string }> }) {
  const { mode = "new", voteId, callId } = await searchParams;

  let initialData: Vote | null = null;
  let callData: Call | null = null;
  let callAnswers: any[] = [];

  if ((mode === "edit" || mode === "copy") && voteId) {
    initialData = await fetchVote(voteId);
    if (!initialData) notFound();
  }

  if (mode === "createFromCall" && callId) {
    // 募集データから作成
    const callSnap = await db.collection("calls").doc(callId).get();
    if (callSnap.exists) {
      callData = { id: callSnap.id, ...callSnap.data() } as Call;
      // 回答も取得
      const answersSnap = await db.collection("callAnswers").get();
      callAnswers = answersSnap.docs
        .filter(doc => doc.id.startsWith(callId + "_"))
        .map(doc => doc.data().answers || {});
    } else {
      notFound();
    }
  }

  return (
    <VoteEditClient
      mode={mode as "new" | "edit" | "copy" | "createFromCall"}
      voteId={voteId}
      initialVote={initialData}
      callData={callData}
      callAnswers={callAnswers}
    />
  );
}
