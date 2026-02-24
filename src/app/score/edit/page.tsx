import { getScoreServer, getGenresServer } from "@/src/features/scores/api/score-service";
import { ScoreEditClient } from "@/src/features/scores/components/ScoreEditClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ mode?: string; scoreId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { mode } = await searchParams;
  return {
    title: mode === "edit" ? "譜面編集" : "譜面新規作成",
  };
}

export default async function ScoreEditPage({ searchParams }: Props) {
  const { mode, scoreId } = await searchParams;

  // モードチェック
  const validModes = ["new", "edit", "copy"];
  if (!mode || !validModes.includes(mode)) notFound();

  // 編集・コピー時はデータ取得
  const [initialScore, allGenres] = await Promise.all([
    scoreId ? getScoreServer(scoreId) : null,
    getGenresServer(),
  ]);

  if ((mode === "edit" || mode === "copy") && !initialScore) {
    notFound();
  }

  return (
    <ScoreEditClient 
      mode={mode as "new" | "edit" | "copy"}
      scoreId={scoreId}
      initialScore={initialScore}
      allGenres={allGenres}
    />
  );
}