import { getScoresServer, getGenresServer, getUpcomingEventsWithSetlistServer } from "@/src/features/scores/api/score-server-actions";
import { ScoreListClient } from "@/src/features/scores/views/list/ScoreListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "譜面一覧",
};

// 練習日等の集中アクセスによる多重全件取得を防ぐため5分間キャッシュ
export const revalidate = 300;

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