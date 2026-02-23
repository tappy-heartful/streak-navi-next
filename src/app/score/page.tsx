import { getScoresServer, getGenresServer } from "@/src/lib/firestore/scores";
import { getUpcomingEventsWithSetlistServer } from "@/src/lib/firestore/events";
import ScoreListClient from "./ScoreListClient";
import type { Metadata } from "next";

// Metadataはサーバーコンポーネントでしか動かないのでここに置く
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