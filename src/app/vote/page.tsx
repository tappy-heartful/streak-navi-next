import { fetchVotes, fetchVoteAnswersMap } from "@/src/features/vote/api/vote-server-actions";
import { VoteListClient } from "@/src/features/vote/views/list/VoteListClient";

export const metadata = {
  title: "投票一覧",
};

export const dynamic = 'force-dynamic';

export default async function VoteListPage() {
  const [votes, participantCountMap] = await Promise.all([
    fetchVotes(),
    fetchVoteAnswersMap()
  ]);

  return (
    <VoteListClient
      votes={votes}
      participantCountMap={participantCountMap}
    />
  );
}
