"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Live } from "@/src/lib/firestore/types";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { getDayOfWeek, isInTerm } from "@/src/lib/functions";

type Props = {
  initialData: { lives: Live[] };
};

function formatDate(dateStr: string) {
  const day = getDayOfWeek(dateStr, true);
  return `${dateStr} (${day})`;
}

function formatPrice(price?: number) {
  if (price == null) return "-";
  return `¥${price.toLocaleString()}`;
}

function LiveTable({ lives, showMap = false }: { lives: Live[]; showMap?: boolean }) {
  if (lives.length === 0) {
    return <p className="empty-message">データがありません🍀</p>;
  }
  return (
    <div className="list-table-wrapper">
      <table className="list-table">
        <thead>
          <tr>
            <th>ライブ名</th>
            <th>日付</th>
            <th>会場</th>
            <th>前売</th>
            <th>当日</th>
            {showMap && <th>Map</th>}
            {showMap && <th>フライヤー</th>}
          </tr>
        </thead>
        <tbody>
          {lives.map((l) => (
            <tr key={l.id}>
              <td>
                <Link href={`/live/confirm?liveId=${l.id}`} className="list-cell-header">
                  {l.title}
                </Link>
              </td>
              <td className="list-cell-small">{l.date ? formatDate(l.date) : "-"}</td>
              <td className="list-cell-small">{l.venue || "-"}</td>
              <td className="list-cell-small">{formatPrice(l.advance)}</td>
              <td className="list-cell-small">{formatPrice(l.door)}</td>
              {showMap && (
                <td className="list-cell-small">
                  {l.venueGoogleMap ? (
                    <a href={l.venueGoogleMap} target="_blank" rel="noopener noreferrer" className="list-cell-link">
                      <i className="fas fa-map-marker-alt" /> Map
                    </a>
                  ) : "-"}
                </td>
              )}
              {showMap && (
                <td className="list-cell-small">
                  {l.flyerUrl ? (
                    <a href={l.flyerUrl} target="_blank" rel="noopener noreferrer" className="list-cell-link">
                      <i className="fas fa-image" /> 画像
                    </a>
                  ) : "-"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LiveListClient({ initialData }: Props) {
  const [todayStr, setTodayStr] = useState<string | null>(null);

  useEffect(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    setTodayStr(`${y}.${m}.${d}`);
  }, []);

  const upcoming = todayStr
    ? initialData.lives.filter((l) => (l.date || "") >= todayStr).sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    : [];
  const closed = todayStr
    ? initialData.lives.filter((l) => (l.date || "") < todayStr).sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    : [];

  return (
    <ListBaseLayout title="ライブ" icon="fa fa-music" basePath="/live" count={initialData.lives.length}>
      <div className="container">
        <section>
          <h3>✅ 今後のライブ予定</h3>
          <LiveTable lives={upcoming} showMap />
        </section>

        <section style={{ marginTop: "24px" }}>
          <h3>🔚 終了したライブ</h3>
          <LiveTable lives={closed} />
        </section>
      </div>
    </ListBaseLayout>
  );
}
