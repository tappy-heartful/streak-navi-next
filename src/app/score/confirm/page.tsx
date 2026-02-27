import { getScoreServer, getGenresServer } from "@/src/features/scores/api/score-server-actions";
import { ScoreConfirmClient } from "@/src/features/scores/views/confirm/ScoreConfirmClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Genre, Score } from "@/src/lib/firestore/types"; // 型をインポート

type Props = {
  searchParams: Promise<{ scoreId?: string }>;
};

/**
 * 動的メタデータ生成
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const scoreId = resolvedParams.scoreId;

  if (!scoreId) return { title: "譜面確認" };

  const scoreData = await getScoreServer(scoreId) as Score | null;

  return {
    title: scoreData ? `${scoreData.title} | 譜面確認` : "譜面確認",
  };
}

/**
 * 譜面確認ページ（サーバーコンポーネント）
 */
export default async function ScoreConfirmPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const scoreId = resolvedParams.scoreId;

  if (!scoreId) notFound();

  // サーバーサイドでデータ取得。型を明示的に指定する
  const [scoreData, allGenres] = await Promise.all([
    getScoreServer(scoreId) as Promise<Score | null>,
    getGenresServer() as Promise<Genre[]>,
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