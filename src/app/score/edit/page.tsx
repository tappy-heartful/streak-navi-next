import { getScoreServer, getGenresServer } from "@/src/features/scores/api/score-server-actions";
import { ScoreEditClient } from "@/src/features/scores/views/edit/ScoreEditClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Genre } from "@/src/lib/firestore";

type Props = {
  searchParams: Promise<{ mode?: string; scoreId?: string }>;
};

/**
 * 動的メタデータ生成: タブのタイトルに曲名を表示
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const scoreId = resolvedParams.scoreId;
  const mode = resolvedParams.mode;

  if (!mode || mode === "new" || !scoreId) {
    return { title: mode === "edit" ? "譜面編集" : "譜面新規作成" };
  }

  const scoreData = await getScoreServer(scoreId);
  return {
    title: scoreData ? `${scoreData.title} | 譜面編集` : "譜面編集",
  };
}

export default async function ScoreEditPage({ searchParams }: Props) {
  const { mode, scoreId } = await searchParams;

  const validModes = ["new", "edit", "copy"];
  if (!mode || !validModes.includes(mode)) notFound();

  const [initialScore, allGenresData] = await Promise.all([
    scoreId ? getScoreServer(scoreId) : null,
    getGenresServer(),
  ]);

  // 取得したデータを Genre[] として扱う
  const allGenres = allGenresData as Genre[];

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