"use client";

import Link from "next/link";
import styles from "./score-list.module.css";
import { useAuth } from "@/src/contexts/AuthContext";
import { useSearchableList } from "@/src/hooks/useSearchableList";
import { SearchableListLayout } from "@/src/components/Layout/SearchableListLayout";
import { Score, Genre } from "@/src/lib/firestore/types"; // 型をインポート

// Propsの型も定義しておくと安全です
type Props = {
  initialData: {
    scores: Score[];
    genres: Genre[];
    events: any[]; // Event型があれば差し替え
  };
};

export function ScoreListClient({ initialData }: Props) {
  const { isAdmin } = useAuth();

  // 1. 第1引数に <Score, フィルタの型> を明示的に指定
  const { filters, updateFilter, resetFilters, filteredData } = useSearchableList<
    Score, 
    { search: string; genre: string; eventId: string; sort: string }
  >(
    initialData.scores,
    { search: "", genre: "", eventId: initialData.events[0]?.id || "", sort: "createdAt-desc" },
    (s, f) => {
      // これで s が Score 型として認識されます
      const matchTitle = s.title?.toLowerCase().includes(f.search.toLowerCase());
      const matchGenre = !f.genre || s.genres?.includes(f.genre);
      let matchEvent = true;
      if (f.eventId) {
        const event = initialData.events.find((e: any) => e.id === f.eventId);
        matchEvent = event?.scoreIdsInSetlist?.includes(s.id);
      }
      return !!(matchTitle && matchGenre && matchEvent);
    },
    (a, b, f) => {
      // ここでも a, b が Score 型になります
      if (f.eventId) {
        const event = initialData.events.find((e: any) => e.id === f.eventId);
        const orderedIds = event?.scoreIdsInSetlist || [];
        return orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id);
      }
      const [key, order] = f.sort.split("-");
      if (key === "title") {
        return order === "asc" 
          ? (a.title || "").localeCompare(b.title || "", "ja") 
          : (b.title || "").localeCompare(a.title || "", "ja");
      }
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return order === "asc" ? timeA - timeB : timeB - timeA;
    }
  );

  // YouTubeプレイリストURLの計算（可変部分用）
  const playlistUrl = filteredData
    .map((s: any) => s.youtubeId)
    .filter(Boolean)
    .join(",");

  return (
    <SearchableListLayout
      title="譜面" icon="fa fa-music" basePath="/score" isAdmin={isAdmin}
      count={filteredData.length} onClear={resetFilters}
      tableHeaders={["タイトル", "譜面", "音源", "ジャンル"]}
      searchFields={
        <>
          <input type="text" className="form-control" placeholder="タイトルで検索..." 
            value={filters.search} onChange={(e) => updateFilter("search", e.target.value)} />
          <div className={styles.filterGrid}>
            <select value={filters.genre} onChange={(e) => updateFilter("genre", e.target.value)}>
              <option value="">ジャンルを選択</option>
              {initialData.genres.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select value={filters.eventId} onChange={(e) => updateFilter("eventId", e.target.value)}>
              <option value="">イベントを選択</option>
              {initialData.events.map((e: any) => <option key={e.id} value={e.id}>{e.date} {e.title}</option>)}
            </select>
            {!filters.eventId && (
              <select value={filters.sort} onChange={(e) => updateFilter("sort", e.target.value)}>
                <option value="createdAt-desc">新着順</option>
                <option value="createdAt-asc">古い順</option>
                <option value="title-asc">タイトル昇順</option>
                <option value="title-desc">タイトル降順</option>
              </select>
            )}
          </div>
        </>
      }
      extraHeaderContent={playlistUrl && (
        <a href={`https://www.youtube.com/watch_videos?video_ids=${playlistUrl}`} target="_blank" rel="noreferrer" className={styles.playlistButton}>
          <i className="fa-brands fa-youtube"></i> 参考音源プレイリスト
        </a>
      )}
    >
      {filteredData.length > 0 ? filteredData.map((s: any) => (
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
            {s.genres?.map((gid: string) => initialData.genres.find((g: any) => g.id === gid)?.name).filter(Boolean).join("\n") || "-"}
          </td>
        </tr>
      )) : (
        <tr><td colSpan={4} className="text-center">該当の譜面はありません🍀</td></tr>
      )}
    </SearchableListLayout>
  );
}