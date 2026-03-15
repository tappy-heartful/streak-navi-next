import { notFound } from "next/navigation";
import { fetchVote, fetchVoteAnswersByVoteId } from "@/src/features/vote/api/vote-server-actions";
import { VoteConfirmClient } from "@/src/features/vote/views/confirm/VoteConfirmClient";
import { adminDb as db } from "@/src/lib/firebase-admin";

export const metadata = { title: "投票確認" };
export const dynamic = 'force-dynamic';

export default async function VoteConfirmPage({ searchParams }: { searchParams: Promise<{ voteId: string }> }) {
  const { voteId } = await searchParams;
  if (!voteId) notFound();

  const [vote, voteAnswers, usersSnap] = await Promise.all([
    fetchVote(voteId),
    fetchVoteAnswersByVoteId(voteId),
    db.collection("users").get()
  ]);

  if (!vote) notFound();

  const usersMap: Record<string, {name: string; pictureUrl: string}> = {};
  usersSnap.docs.forEach((doc) => {
    const data = doc.data();
    usersMap[doc.id] = {
      name: data.displayName || "名無し",
      pictureUrl: data.pictureUrl || ""
    };
  });

  return (
    <VoteConfirmClient
      voteData={vote}
      voteId={voteId}
      voteAnswers={voteAnswers}
      usersMap={usersMap}
    />
  );
}
