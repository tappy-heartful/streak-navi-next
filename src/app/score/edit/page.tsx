import { getScoreServer, getGenresServer, getSectionsServer, getInstrumentsServer, getDefaultInstrumentConfigServer } from "@/src/features/scores/api/score-server-actions";
import { ScoreEditClient } from "@/src/features/scores/views/edit/ScoreEditClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Genre, Section, Instrument, InstrumentPart } from "@/src/lib/firestore/types";

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
    return { title: "譜面新規登録" };
  }

  const scoreData = await getScoreServer(scoreId);
  return {
    title: scoreData?.title ? `${scoreData.title} - 譜面編集` : "譜面編集",
  };
}

export const dynamic = "force-dynamic";

export default async function ScoreEditPage({ searchParams }: Props) {
  const { mode, scoreId } = await searchParams;

  const validModes = ["new", "edit", "copy"];
  if (!mode || !validModes.includes(mode)) notFound();

  const [initialScore, allGenresData, allSectionsData, allInstrumentsData, defaultInstrumentConfig] = await Promise.all([
    scoreId ? getScoreServer(scoreId) : null,
    getGenresServer(),
    getSectionsServer(),
    getInstrumentsServer(),
    getDefaultInstrumentConfigServer(),
  ]);

  // 取得したデータを Genre[] として扱う
  const allGenres = allGenresData as Genre[];
  const allSections = allSectionsData as Section[];
  const allInstruments = allInstrumentsData as Instrument[];

  if ((mode === "edit" || mode === "copy") && !initialScore) {
    notFound();
  }

  return (
    <ScoreEditClient 
      mode={mode as "new" | "edit" | "copy"}
      scoreId={scoreId}
      initialScore={initialScore}
      allGenres={allGenres}
      allSections={allSections}
      allInstruments={allInstruments}
      defaultInstrumentConfig={defaultInstrumentConfig}
    />
  );
}