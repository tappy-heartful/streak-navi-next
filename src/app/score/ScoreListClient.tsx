"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import * as utils from "@/src/lib/functions";
import styles from "./score-list.module.css";

export default function ScoreListClient({ initialData }: any) {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [eventId, setEventId] = useState("");
  const [sort, setSort] = useState("createdAt-desc");

  // フィルタリングとソートのロジック
  const filteredScores = useMemo(() => {
    let result = initialData.scores.filter((s: any) => {
      const matchTitle = s.title?.toLowerCase().includes(search.toLowerCase());
      const matchGenre = !genre || s.genres?.includes(genre);
      let matchEvent = true;
      if (eventId) {
        const event = initialData.events.find((e: any) => e.id === eventId);
        matchEvent = event?.scoreIdsInSetlist.includes(s.id);
      }
      return matchTitle && matchGenre && matchEvent;
    });

    result.sort((a: any, b: any) => {
      if (eventId) {
        const event = initialData.events.find((e: any) => e.id === eventId);
        const orderedIds = event.scoreIdsInSetlist;
        return orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id);
      }
      const [key, order] = sort.split("-");
      if (key === "title") {
        return order === "asc" ? a.title.localeCompare(b.title, "ja") : b.title.localeCompare(a.title, "ja");
      }
      return order === "asc" ? (a.createdAt || 0) - (b.createdAt || 0) : (b.createdAt || 0) - (a.createdAt || 0);
    });

    return result;
  }, [search, genre, eventId, sort, initialData]);

  const playlistUrl = useMemo(() => {
    const ids = filteredScores.map((s: any) => s.youtubeId).filter(Boolean).join(",");
    return ids ? `https://www.youtube.com/watch_videos?video_ids=${ids}` : null;
  }, [filteredScores]);

  return (
    <main>
      <div className="page-header"><h1><i className="fa fa-music"></i> 譜面一覧</h1></div>

      <div className="container">
        <h3>検索</h3>
        <input type="text" className="form-control" placeholder="タイトルで検索..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className={styles.filterGrid}>
          <select value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">ジャンルを選択</option>
            {initialData.genres.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">イベントを選択</option>
            {initialData.events.map((e: any) => <option key={e.id} value={e.id}>{e.date} {e.title}</option>)}
          </select>
          {!eventId && (
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="createdAt-desc">新着順</option>
              <option value="createdAt-asc">古い順</option>
              <option value="title-asc">タイトル昇順</option>
              <option value="title-desc">タイトル降順</option>
            </select>
          )}
        </div>
        <div className="confirm-buttons">
            <button className="clear-button" onClick={() => { setSearch(""); setGenre(""); setEventId(""); setSort("createdAt-desc"); }}>クリア</button>
        </div>
      </div>

      <div className="container">
        <div className={styles.scoreHeader}>
          <h3>譜面 ({filteredScores.length}件)</h3>
          {playlistUrl && (
            <a href={playlistUrl} target="_blank" rel="noreferrer" className={styles.playlistButton}>
              <i className="fa-brands fa-youtube"></i> 参考音源プレイリスト
            </a>
          )}
        </div>

        <div className="table-wrapper">
          <table className="list-table">
            <thead>
              <tr>
                <th>タイトル</th>
                <th className="text-center">譜面</th>
                <th className="text-center">音源</th>
                <th>ジャンル</th>
              </tr>
            </thead>
            <tbody>
              {filteredScores.length > 0 ? filteredScores.map((s: any) => (
                <tr key={s.id}>
                  <td className="list-table-row-header">
                    <Link href={`/score-confirm?scoreId=${s.id}`}>{s.title}</Link>
                  </td>
                  <td className="text-center">
                    {(s.scoreUrl || s.scoreUrl) ? <a href={s.scoreUrl || s.scoreUrl} target="_blank" rel="noreferrer"><i className="fa-solid fa-file-pdf"></i> 譜面</a> : "-"}
                  </td>
                  <td className="text-center">
                    {(s.referenceTrack || s.referenceTrack) ? <a href={s.referenceTrack || s.referenceTrack} target="_blank" rel="noreferrer"><i className="fab fa-youtube"></i> 音源</a> : "-"}
                  </td>
                  <td className={styles.genreCell}>
                    {s.genres?.map((gid: string) => initialData.genres.find((g: any) => g.id === gid)?.name).filter(Boolean).join(", ") || "-"}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="text-center">該当の譜面はありません🍀</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="page-footer">
        <Link href="/home" className="back-link">← ホームに戻る</Link>
      </div>
    </main>
  );
}