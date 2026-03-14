import { notFound } from "next/navigation";
import { fetchVote } from "@/src/features/vote/api/vote-server-actions";
import { VoteLinkEditClient } from "@/src/features/vote/views/link-edit/VoteLinkEditClient";

export const metadata = { title: "投票リンク設定" };
export const dynamic = 'force-dynamic';

export default async function VoteLinkEditPage({ searchParams }: { searchParams: Promise<{ voteId: string }> }) {
  const { voteId } = await searchParams;
  if (!voteId) notFound();

  const vote = await fetchVote(voteId);
  if (!vote) notFound();

  return (
    <VoteLinkEditClient
      vote={vote}
      voteId={voteId}
    />
  );
}
