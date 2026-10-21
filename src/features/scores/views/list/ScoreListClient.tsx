"use client";

import { useState } from "react";
import { useSearchableList } from "@/src/hooks/useSearchableList";
import { SearchableListLayout } from "@/src/components/Layout/SearchableListLayout";
import { Score, Genre, EventWithSetlist } from "@/src/lib/firestore/types";
import { scoreFilterFn, scoreSortFn, ScoreFilters } from "@/src/features/scores/lib/score-search-engine";
import {
  ListFilterGrid, FilterInput, FilterSelect,
  ListRow, ListCellHeader, ListCellLink, ListCellSmall
} from "@/src/components/List/ListParts";
import { ScoreFileListModal } from "@/src/features/scores/components/ScoreFileListModal";
import styles from "./ScoreListClient.module.css";

type Props = {
  initialData: {
    scores: Score[];
    genres: Genre[];
    events: EventWithSetlist[];
  };
};

export function ScoreListClient({ initialData }: Props) {
  const [selectedScoreForModal, setSelectedScoreForModal] = useState<Score | null>(null);

  const list = useSearchableList<Score, ScoreFilters>(
    initialData.scores,
    { search: "", genre: "", eventId: initialData.events[0]?.id || "", sort: "createdAt-desc" },
    (s, f) => scoreFilterFn(s, f, initialData.events),
    (a, b, f) => scoreSortFn(a, b, f, initialData.events)
  );

  const playlistIds = list.filteredData.map((s) => s.youtubeId).filter(Boolean).join(",");

  return (
    <>
      <SearchableListLayout
        title="譜面" icon="fa-solid fa-music" basePath="/score"
        list={list}
        tableHeaders={["タイトル", "譜面", "音源", "ジャンル", "略称"]}
        searchFields={
          <ListFilterGrid>
            <FilterInput
              placeholder="タイトルで検索..."
              value={list.filters.search}
              onChange={(v) => list.updateFilter("search", v)}
            />
            <FilterSelect
              label="ジャンルを選択"
              options={initialData.genres}
              value={list.filters.genre}
              onChange={(v) => list.updateFilter("genre", v)}
            />
            <FilterSelect
              label="イベントを選択"
              options={initialData.events.map(e => ({ id: e.id, name: `${e.date} ${e.title}` }))}
              value={list.filters.eventId}
              onChange={(v) => list.updateFilter("eventId", v)}
            />
            {!list.filters.eventId && (
              <FilterSelect
                label="並び替え"
                options={[
                  { id: "createdAt-desc", name: "新着順" },
                  { id: "createdAt-asc", name: "古い順" },
                  { id: "title-asc", name: "タイトル昇順" },
                  { id: "title-desc", name: "タイトル降順" },
                ]}
                value={list.filters.sort}
                onChange={(v) => list.updateFilter("sort", v)}
              />
            )}
          </ListFilterGrid>
        }
        extraHeaderContent={playlistIds && (
          <a href={`https://www.youtube.com/watch_videos?video_ids=${playlistIds}`} target="_blank" rel="noreferrer" className="list-badge-button">
            <i className="fa-brands fa-youtube"></i> 参考音源プレイリスト
          </a>
        )}
      >
        {list.filteredData.map((s) => {
          const fileCount = (s.files?.length || 0) + (s.scoreUrl && (!s.files || s.files.length === 0) ? 1 : 0);
          return (
            <ListRow key={s.id}>
              <ListCellHeader href={`/score/confirm?scoreId=${s.id}`}>
                {s.title}
              </ListCellHeader>

              <td className="text-center">
                <button
                  type="button"
                  className={`${styles.scoreModalButton} ${fileCount === 0 ? styles.emptyFileButton : ""}`}
                  onClick={() => setSelectedScoreForModal(s)}
                  title="譜面ファイル一覧を表示"
                >
                  <i className="fa-solid fa-file-lines" />
                  <span>譜面</span>
                  {fileCount > 0 && (
                    <span className={styles.fileCountBadge}>{fileCount}</span>
                  )}
                </button>
              </td>

              <ListCellLink href={s.referenceTrack} icon="fab fa-youtube" label="音源" />

              <ListCellSmall>
                {s.genres?.map((gid: string) => initialData.genres.find((g) => g.id === gid)?.name).filter(Boolean).join("\n")}
              </ListCellSmall>

              <ListCellSmall>
                {s.abbreviation}
              </ListCellSmall>
            </ListRow>
          );
        })}
      </SearchableListLayout>

      <ScoreFileListModal
        isOpen={Boolean(selectedScoreForModal)}
        onClose={() => setSelectedScoreForModal(null)}
        title={selectedScoreForModal?.title || ""}
        scoreId={selectedScoreForModal?.id}
        files={selectedScoreForModal?.files}
        legacyScoreUrl={selectedScoreForModal?.scoreUrl}
      />
    </>
  );
}