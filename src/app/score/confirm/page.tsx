import { getScoreServer, getGenresServer } from "@/src/features/scores/api/score-server-actions";
import { ScoreConfirmClient } from "@/src/features/scores/components/ScoreConfirmClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ scoreId?: string }>;
};

/**
 * 動적メタデータ生成: タブのタイトルに曲名を表示
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const scoreId = resolvedParams.scoreId;

  if (!scoreId) return { title: "譜面確認" };

  const scoreData = await getScoreServer(scoreId);

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

  // サーバーサイドでデータ取得
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