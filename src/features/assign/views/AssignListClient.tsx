"use client";

import React, { useMemo } from "react";
import { Event } from "@/src/lib/firestore/types";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import Link from "next/link";
import * as utils from "@/src/lib/functions";

type Props = {
  initialEvents: Event[];
};

export function AssignListClient({ initialEvents }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();

  React.useEffect(() => {
    setBreadcrumbs([{ title: "譜割り一覧" }]);
  }, [setBreadcrumbs]);

  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { future, scheduling, closed } = useMemo(() => {
    const future: Event[] = [];
    const scheduling: Event[] = [];
    const closed: Event[] = [];

    initialEvents.forEach(event => {
      const dateStr = event.date;
      let isPast = false;

      if (dateStr) {
        const [year, month, day] = dateStr.split(".").map(Number);
        const eventDate = new Date(year, month - 1, day);
        if (eventDate < todayOnly) isPast = true;
      }

      if (isPast) {
        closed.push(event);
      } else if (event.attendanceType === "schedule") {
        scheduling.push(event);
      } else {
        future.push(event);
      }
    });

    future.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    return { future, scheduling, closed };
  }, [initialEvents]);

  return (
    <BaseLayout>
      <div className="page-header">
        <h1><i className="fa-solid fa-music" /> 譜割り一覧</h1>
      </div>

      {/* 今後のイベント */}
      <div className="container" style={{ marginBottom: "24px" }}>
        <h3>📅 今後のイベント</h3>
        <EventList events={future} />
      </div>

      {/* 日程調整中（件数がある場合のみ表示） */}
      {scheduling.length > 0 && (
        <div className="container" style={{ marginBottom: "24px" }}>
          <h3>🗓️ 日程調整中のイベント</h3>
          <EventList events={scheduling} />
        </div>
      )}

      {/* 過去のイベント */}
      <div className="container" style={{ marginBottom: "24px" }}>
        <h3>🔚 過去のイベント</h3>
        <EventList events={closed} isClosed />
      </div>
    </BaseLayout>
  );
}

function EventList({ events, isClosed = false }: { events: Event[]; isClosed?: boolean }) {
  if (events.length === 0) {
    return (
      <p className="empty-message" style={{ color: "#999", padding: "12px 0" }}>
        該当のイベントはありません🍀
      </p>
    );
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {events.map(event => (
        <li key={event.id} style={{ marginBottom: "12px" }}>
          <Link
            href={`/assign/confirm?eventId=${event.id}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: "#f9f9f9",
              boxShadow: "1px 1px 5px rgba(0,0,0,0.05)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              {event.date && (
                <span style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>
                  {utils.getDayOfWeek(event.date)}
                </span>
              )}
              <span style={{ fontSize: "16px", fontWeight: "bold" }}>{event.title}</span>
            </div>
            {isClosed && (
              <span className="answer-status closed">終了</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
