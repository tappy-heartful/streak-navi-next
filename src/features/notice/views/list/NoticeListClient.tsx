"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Notice } from "@/src/lib/firestore/types";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { parseDate } from "@/src/lib/functions";

type Props = {
  initialNotices: Notice[];
};

export function NoticeListClient({ initialNotices }: Props) {
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { future, closed } = useMemo(() => {
    const future: Notice[] = [];
    const closed: Notice[] = [];

    initialNotices.forEach(notice => {
      const latestDate = notice.schedules
        .map(s => parseDate(s.scheduledDate))
        .filter(Boolean)
        .reduce<Date | null>((latest, d) => {
          if (!latest || (d && d > latest)) return d;
          return latest;
        }, null);

      if (latestDate && latestDate < todayOnly) {
        closed.push(notice);
      } else {
        future.push(notice);
      }
    });

    return { future, closed };
  }, [initialNotices]);

  return (
    <ListBaseLayout title="通知設定" basePath="/notice" icon="fa-solid fa-bell">
      {/* 自動通知設定 */}
      <div className="container" style={{ marginBottom: "24px" }}>
        <h3>⚙️ 自動通知設定</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li style={{ marginBottom: "12px" }}>
            <Link
              href="/notice/auto-confirm"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
                boxShadow: "1px 1px 5px rgba(0,0,0,0.05)",
                textDecoration: "none",
              }}
            >
              <span style={{ fontWeight: "bold" }}>自動通知設定を見る</span>
              <i className="fa-solid fa-chevron-right" style={{ color: "#aaa" }} />
            </Link>
          </li>
        </ul>
      </div>

      {/* バンマス専用通知（今後） */}
      <div className="container" style={{ marginBottom: "24px" }}>
        <h3>📣 バンマス専用通知（今後）</h3>
        <NoticeList notices={future} />
      </div>

      {/* バンマス専用通知（終了） */}
      {closed.length > 0 && (
        <div className="container" style={{ marginBottom: "24px" }}>
          <h3>🔚 バンマス専用通知（終了）</h3>
          <NoticeList notices={closed} isClosed />
        </div>
      )}
    </ListBaseLayout>
  );
}

function getNoticeTitle(notice: Notice): string {
  if (notice.relatedId && notice.relatedType !== "none") {
    return notice.relatedTitle || `[${notice.relatedType}] 紐づけ対象が見つかりません`;
  }
  const dates = notice.schedules.map(s => s.scheduledDate).filter(Boolean);
  const dateDisplay = dates.length > 0 ? dates.join(", ") : "日付未設定";
  return `[${dateDisplay}] のカスタム通知`;
}

function getNoticeDateDisplay(notice: Notice): string {
  const dates = notice.schedules.map(s => s.scheduledDate).filter(Boolean);
  return dates.length > 0 ? dates.join(", ") : "日付未設定";
}

function NoticeList({ notices, isClosed = false }: { notices: Notice[]; isClosed?: boolean }) {
  if (notices.length === 0) {
    return (
      <p style={{ color: "#999", padding: "12px 0" }}>
        該当の通知設定はありません🍀
      </p>
    );
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {notices.map(notice => (
        <li key={notice.id} style={{ marginBottom: "12px" }}>
          <Link
            href={`/notice/confirm?noticeId=${notice.id}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: "#f9f9f9",
              boxShadow: "1px 1px 5px rgba(0,0,0,0.05)",
              textDecoration: "none",
              opacity: isClosed ? 0.7 : 1,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>
                {getNoticeDateDisplay(notice)}
              </span>
              <span style={{ fontSize: "15px", fontWeight: "bold" }}>
                {getNoticeTitle(notice)}
              </span>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: "#aaa" }} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
