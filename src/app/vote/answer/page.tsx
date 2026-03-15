import { notFound } from "next/navigation";
import { fetchVote, fetchMyVoteAnswer } from "@/src/features/vote/api/vote-server-actions";
import { VoteAnswerClient } from "@/src/features/vote/views/answer/VoteAnswerClient";

export const metadata = { title: "投票回答" };
export const dynamic = 'force-dynamic';

export default async function VoteAnswerPage({ searchParams }: { searchParams: Promise<{ voteId: string }> }) {
  const { voteId } = await searchParams;
  if (!voteId) notFound();

  const vote = await fetchVote(voteId);
  if (!vote) notFound();

  // Answer state will be handled on client side since uid requires localStorage in App Router (or we could wait until client to fetch it, but let's just pass `voteId` and `vote` down, fetch user's answer locally).
  // Actually, we can fetch myAnswer on client side like we did before.

  return (
    <VoteAnswerClient
      vote={vote}
      voteId={voteId}
    />
  );
}
