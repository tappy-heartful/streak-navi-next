"use client";

import Link from "next/link";
import styles from "./score-list.module.css";
import { useSearchableList } from "@/src/hooks/useSearchableList";
import { SearchableListLayout } from "@/src/components/Layout/SearchableListLayout";
import { Score, Genre } from "@/src/lib/firestore/types";
import { scoreFilterFn, scoreSortFn, ScoreFilters } from "@/src/features/scores/lib/score-search-engine";

type Props = {
  initialData: {
    scores: Score[];
    genres: Genre[];
    events: any[];
  };
};

export function ScoreListClient({ initialData }: Props) {
  // 1. ロジックの設定（クライアントサイドで完結する知能を渡す）
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
      // ★ onSearch を渡さないことで、検索ボタン非表示 ＆ 即時フィルタリングモードになる
      searchFields={
        <>
          <input type="text" className="form-control" placeholder="タイトルで検索..." 
            value={list.filters.search} onChange={(e) => list.updateFilter("search", e.target.value)} />
          <div className={styles.filterGrid}>
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
          </div>
        </>
      }
      extraHeaderContent={playlistIds && (
        <a href={`https://www.youtube.com/watch_videos?video_ids=${playlistIds}`} target="_blank" rel="noreferrer" className={styles.playlistButton}>
          <i className="fa-brands fa-youtube"></i> 参考音源プレイリスト
        </a>
      )}
    >
      {list.filteredData.map((s) => (
        <tr key={s.id}>
          <td className="list-table-row-header">
            <Link href={`/score/confirm?scoreId=${s.id}`}>{s.title}</Link>
          </td>
          <td className="text-center">
            {s.scoreUrl ? <a href={s.scoreUrl} target="_blank" rel="noreferrer"><i className="fa-solid fa-file-pdf"></i> 譜面</a> : "-"}
          </td>
          <td className="text-center">
            {s.referenceTrack ? <a href={s.referenceTrack} target="_blank" rel="noreferrer"><i className="fab fa-youtube"></i> 音源</a> : "-"}
          </td>
          <td className={styles.genreCell}>
            {s.genres?.map((gid) => initialData.genres.find((g) => g.id === gid)?.name).filter(Boolean).join("\n") || "-"}
          </td>
        </tr>
      ))}
    </SearchableListLayout>
  );
}