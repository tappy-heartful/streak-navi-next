import { getScoreServer, getGenresServer } from "@/src/lib/firestore/scores";
import ScoreConfirmClient from "./ScoreConfirmClient";
import { notFound } from "next/navigation";

// 型定義も Promise に変更
export default async function ScoreConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ scoreId?: string }>;
}) {
  // 1. searchParams を await して中身を取り出す
  const resolvedParams = await searchParams;
  const scoreId = resolvedParams.scoreId;

  if (!scoreId) notFound();

  // 2. サーバーサイドでデータ取得
  const [scoreData, allGenres] = await Promise.all([
    getScoreServer(scoreId),
    getGenresServer(),
  ]);

  if (!scoreData) notFound();

  return (
    <ScoreConfirmClient 
      scoreData={scoreData} 
      allGenres={allGenres} 
      scoreId={scoreId} 
    />
  );
}