"use client";

import { useSearchableList } from "@/src/hooks/useSearchableList";
import { SearchableListLayout } from "@/src/components/Layout/SearchableListLayout";
import { Score, Genre } from "@/src/lib/firestore/types";
import { scoreFilterFn, scoreSortFn, ScoreFilters } from "@/src/features/scores/lib/score-search-engine";
// 共通パーツをインポート
import { ListFilterGrid, ListRow, ListCellHeader, ListCellCenter, ListCellSmall } from "@/src/components/List/ListParts";

type Props = {
  initialData: {
    scores: Score[];
    genres: Genre[];
    events: any[];
  };
};

export function ScoreListClient({ initialData }: Props) {
  const list = useSearchableList<Score, ScoreFilters>(
    initialData.scores,
    { search: "", genre: "", eventId: initialData.events[0]?.id || "", sort: "createdAt-desc" },
    (s, f) => scoreFilterFn(s, f, initialData.events),
    (a, b, f) => scoreSortFn(a, b, f, initialData.events)
  );

  const playlistIds = list.filteredData.map((s) => s.youtubeId).filter(Boolean).join(",");

  return (
    <SearchableListLayout
      title="譜面" icon="fa fa-music" basePath="/score"
      list={list}
      tableHeaders={["タイトル", "譜面", "音源", "ジャンル"]}
      searchFields={
        <ListFilterGrid>
          <input type="text" className="form-control" placeholder="タイトルで検索..." 
            value={list.filters.search} onChange={(e) => list.updateFilter("search", e.target.value)} />
          
          <select value={list.filters.genre} onChange={(e) => list.updateFilter("genre", e.target.value)}>
            <option value="">ジャンルを選択</option>
            {initialData.genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          <select value={list.filters.eventId} onChange={(e) => list.updateFilter("eventId", e.target.value)}>
            <option value="">イベントを選択</option>
            {initialData.events.map((e) => <option key={e.id} value={e.id}>{e.date} {e.title}</option>)}
          </select>

          {!list.filters.eventId && (
            <select value={list.filters.sort} onChange={(e) => list.updateFilter("sort", e.target.value)}>
              <option value="createdAt-desc">新着順</option>
              <option value="createdAt-asc">古い順</option>
              <option value="title-asc">タイトル昇順</option>
              <option value="title-desc">タイトル降順</option>
            </select>
          )}
        </ListFilterGrid>
      }
      extraHeaderContent={playlistIds && (
        <a href={`https://www.youtube.com/watch_videos?video_ids=${playlistIds}`} target="_blank" rel="noreferrer" className="list-badge-button">
          <i className="fa-brands fa-youtube"></i> 参考音源プレイリスト
        </a>
      )}
    >
      {list.filteredData.map((s) => (
        <ListRow key={s.id}>
          <ListCellHeader href={`/score/confirm?scoreId=${s.id}`}>
            {s.title}
          </ListCellHeader>

          <ListCellCenter>
            {s.scoreUrl && <a href={s.scoreUrl} target="_blank" rel="noreferrer"><i className="fa-solid fa-file-pdf"></i> 譜面</a>}
          </ListCellCenter>

          <ListCellCenter>
            {s.referenceTrack && <a href={s.referenceTrack} target="_blank" rel="noreferrer"><i className="fab fa-youtube"></i> 音源</a>}
          </ListCellCenter>

          <ListCellSmall>
            {s.genres?.map((gid) => initialData.genres.find((g) => g.id === gid)?.name).filter(Boolean).join("\n")}
          </ListCellSmall>
        </ListRow>
      ))}
    </SearchableListLayout>
  );
}