import { getScoresServer, getGenresServer, getUpcomingEventsWithSetlistServer } from "@/src/features/scores/api/score-server-actions";
import { ScoreListClient } from "@/src/features/scores/components/ScoreListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "譜面一覧",
};

export default async function ScoreListPage() {
  // データを並列で取得
  const [scores, genres, events] = await Promise.all([
    getScoresServer(),
    getGenresServer(),
    getUpcomingEventsWithSetlistServer(),
  ]);

  return (
    <ScoreListClient 
      initialData={{ scores, genres, events }} 
    />
  );
}