import { notFound } from "next/navigation";
import { fetchVote } from "@/src/features/vote/api/vote-server-actions";
import { VoteLinkEditClient } from "@/src/features/vote/views/link-edit/VoteLinkEditClient";

import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ voteId?: string }>;
}): Promise<Metadata> {
  const { voteId } = await searchParams;
  if (!voteId) return { title: "投票リンク設定" };

  const vote = await fetchVote(voteId);
  return {
    title: vote?.name ? `${vote.name} - 投票リンク設定` : "投票リンク設定",
  };
}

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
