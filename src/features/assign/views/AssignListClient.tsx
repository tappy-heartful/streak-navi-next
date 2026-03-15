"use client";

import React, { useState, useMemo } from "react";
import { Event } from "@/src/lib/firestore/types";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import styles from "./assign.module.css";
import Link from "next/link";
import * as utils from "@/src/lib/functions";

type Props = {
  initialEvents: Event[];
};

export function AssignListClient({ initialEvents }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const [showClosed, setShowClosed] = useState(false);

  React.useEffect(() => {
    setBreadcrumbs([{ title: "譜割り一覧" }]);
  }, [setBreadcrumbs]);

  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const categorizedEvents = useMemo(() => {
    const future: Event[] = [];
    const scheduling: Event[] = [];
    const closed: Event[] = [];

    initialEvents.forEach(event => {
      const dateStr = event.date;
      let isPast = false;

      if (dateStr) {
        const [year, month, day] = dateStr.split(".").map(Number);
        const eventDate = new Date(year, month - 1, day);
        if (eventDate < todayOnly) {
          isPast = true;
        }
      }

      if (isPast) {
        closed.push(event);
      } else if (event.attendanceType === "schedule") {
        scheduling.push(event);
      } else {
        future.push(event);
      }
    });

    // futureは日付昇順（早い順）
    future.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    return { future, scheduling, closed };
  }, [initialEvents, todayOnly]);

  return (
    <BaseLayout>
      <div className="container">
        <div className="page-header">
          <h1><i className="fa-solid fa-music" /> 譜割り一覧</h1>
        </div>

        <section>
          <h2 className="section-title">今後のイベント</h2>
          <EventList events={categorizedEvents.future} />
        </section>

        <section style={{ marginTop: "30px" }}>
          <h2 className="section-title">日程調整中のイベント</h2>
          <EventList events={categorizedEvents.scheduling} />
        </section>

        {categorizedEvents.closed.length > 0 && (
          <section style={{ marginTop: "30px" }}>
            <div className={styles.toggleHeader} onClick={() => setShowClosed(!showClosed)}>
              <span>終了したイベント</span>
              <i className={`fa-solid ${showClosed ? "fa-chevron-up" : "fa-chevron-down"}`} />
            </div>
            {showClosed && <EventList events={categorizedEvents.closed} isClosed />}
          </section>
        )}
      </div>
    </BaseLayout>
  );
}

function EventList({ events, isClosed = false }: { events: Event[]; isClosed?: boolean }) {
  if (events.length === 0) {
    return (
      <ul className={styles.assignList}>
        <li className={styles.emptyMessage}>
          <div className={`${styles.eventLink} ${styles.empty}`}>
            該当のイベントはありません🍀
          </div>
        </li>
      </ul>
    );
  }

  return (
    <ul className={styles.assignList}>
      {events.map(event => (
        <li key={event.id}>
          <Link href={`/assign/confirm?eventId=${event.id}`} className={styles.eventLink}>
            <div className={styles.eventInfo}>
              {event.date && (
                <span className={styles.eventDate}>
                  📅{utils.getDayOfWeek(event.date)}
                </span>
              )}
              <span className={styles.eventTitle}>{event.title}</span>
            </div>
            {isClosed && (
              <span className={`${styles.answerStatus} ${styles.closed}`}>終了</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
