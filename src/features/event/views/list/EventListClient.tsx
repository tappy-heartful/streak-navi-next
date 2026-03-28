"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Event } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { isInTerm, getDayOfWeek } from "@/src/lib/functions";

type Props = {
  events: Event[];
};

function isEventPast(event: Event): boolean {
  if (!event.date) return false;
  const parts = event.date.split(".");
  if (parts.length !== 3) return false;
  const [y, m, d] = parts.map(Number);
  const eventDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
}

export function EventListClient({ events }: Props) {
  const { isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbs([{ title: "イベント一覧", href: "" }]);
  }, [setBreadcrumbs]);

  const scheduleList = events.filter(
    e => !isEventPast(e) && e.attendanceType === "schedule"
  );
  const futureList = events.filter(
    e => !isEventPast(e) && e.attendanceType !== "schedule"
  );
  const closedList = events
    .filter(e => isEventPast(e))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const renderTermDisplay = (e: Event) => {
    if (!e.acceptStartDate && !e.acceptEndDate) return "-";
    return `${e.acceptStartDate || ""} ～ ${e.acceptEndDate || ""}`;
  };

  const renderStatusCell = (e: Event, type: "schedule" | "future") => {
    const inTerm = isInTerm(e.acceptStartDate, e.acceptEndDate);
    if (!inTerm) return <span className="answer-status closed">期間外</span>;
    return <span className="answer-status pending">受付中</span>;
  };

  return (
    <BaseLayout>
      <div className="page-header">
        <h1><i className="fa-solid fa-calendar-days" /> イベント一覧</h1>
      </div>

      {/* 日程調整中 */}
      {scheduleList.length > 0 && (
        <div className="container" style={{ marginBottom: "24px" }}>
          <h3>🗓️ 日程調整中</h3>
          <div className="table-wrapper">
            <table className="list-table">
              <thead>
                <tr>
                  <th>イベント名</th>
                  <th>候補日</th>
                  <th>回答</th>
                  <th>日程調整<br />受付期間</th>
                  <th>場所</th>
                </tr>
              </thead>
              <tbody>
                {scheduleList.map(e => (
                  <tr key={e.id}>
                    <td className="list-table-row-header">
                      <Link href={`/event/confirm?eventId=${e.id}`}>{e.title}</Link>
                    </td>
                    <td className="text-small">
                      {(e.candidateDates || []).map(d => (
                        <div key={d}>{getDayOfWeek(d)}</div>
                      ))}
                    </td>
                    <td>{renderStatusCell(e, "schedule")}</td>
                    <td className="text-small">{renderTermDisplay(e)}</td>
                    <td>
                      {e.website
                        ? <a href={e.website} target="_blank" rel="noopener noreferrer">{e.placeName || "リンク"}</a>
                        : e.placeName || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: "1rem" }}>
              <Link href="/event/edit?mode=new&type=schedule" className="list-add-button" style={{ width: "fit-content", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ＋ 新規作成
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 今後の予定 */}
      <div className="container" style={{ marginBottom: "24px" }}>
        <h3>✅ 今後の予定</h3>
        <div className="table-wrapper">
          <table className="list-table">
            <thead>
              <tr>
                <th>イベント名</th>
                <th>日付</th>
                <th>回答</th>
                <th>出欠受付期間</th>
                <th>場所</th>
              </tr>
            </thead>
            <tbody>
              {futureList.length === 0 ? (
                <tr><td colSpan={5} className="empty-text">該当のイベントはありません🍀</td></tr>
              ) : (
                futureList.map(e => (
                  <tr key={e.id}>
                    <td className="list-table-row-header">
                      <Link href={`/event/confirm?eventId=${e.id}`}>{e.title}</Link>
                    </td>
                    <td className="text-small">
                      {e.date ? `${e.date}(${getDayOfWeek(e.date, true)})` : "-"}
                    </td>
                    <td>{renderStatusCell(e, "future")}</td>
                    <td className="text-small">{renderTermDisplay(e)}</td>
                    <td>
                      {e.website
                        ? <a href={e.website} target="_blank" rel="noopener noreferrer">{e.placeName || "リンク"}</a>
                        : e.placeName || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: "1rem" }}>
            <Link href="/event/edit?mode=new&type=attendance" className="list-add-button" style={{ width: "fit-content", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ＋ 新規作成
            </Link>
          </div>
        )}
      </div>

      {/* 終了 */}
      {closedList.length > 0 && (
        <div className="container">
          <h3>🔚 終了</h3>
          <div className="table-wrapper">
            <table className="list-table">
              <thead>
                <tr>
                  <th>イベント名</th>
                  <th>日付</th>
                  <th>状況</th>
                  <th>出欠受付期間</th>
                  <th>場所</th>
                </tr>
              </thead>
              <tbody>
                {closedList.map(e => (
                  <tr key={e.id}>
                    <td className="list-table-row-header">
                      <Link href={`/event/confirm?eventId=${e.id}`}>{e.title}</Link>
                    </td>
                    <td className="text-small">
                      {e.date ? `${e.date}(${getDayOfWeek(e.date, true)})` : "-"}
                    </td>
                    <td><span className="answer-status closed">終了</span></td>
                    <td className="text-small">{renderTermDisplay(e)}</td>
                    <td>
                      {e.website
                        ? <a href={e.website} target="_blank" rel="noopener noreferrer">{e.placeName || "リンク"}</a>
                        : e.placeName || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="page-footer">
        <Link href="/home" className="back-link">← ホームに戻る</Link>
      </div>
    </BaseLayout>
  );
}
