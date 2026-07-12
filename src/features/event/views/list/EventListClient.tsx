"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Event } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { isInTerm, getDayOfWeek, format } from "@/src/lib/functions";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

type Props = {
  events: Event[];
  prefNamesMap?: Record<string, string>;
  munNamesMap?: Record<string, string>;
};

function isEventPast(event: Event): boolean {
  if (!event.date) return false;
  const todayStr = format(new Date(), "yyyy.MM.dd");
  return event.date < todayStr;
}

export function EventListClient({ events, prefNamesMap = {}, munNamesMap = {} }: Props) {
  const { userData, isAdmin } = useAuth();
  const uid = userData?.id;
  const { setBreadcrumbs } = useBreadcrumb();

  const [myAttendanceAnswers, setMyAttendanceAnswers] = useState<Record<string, string>>({}); // eventId -> statusName
  const [myAdjustAnswers, setMyAdjustAnswers] = useState<Record<string, Record<string, string>>>({}); // eventId -> date -> statusName
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, string>>({}); // id -> name
  const [adjustStatuses, setAdjustStatuses] = useState<Record<string, string>>({}); // id -> name

  useEffect(() => {
    setBreadcrumbs([{ title: "イベント一覧", href: "" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (!uid) return;

    const loadMyAnswers = async () => {
      // 1. 各種マスターを取得
      const attStatusSnap = await getDocs(collection(db, "attendanceStatuses"));
      const attStatusMap: Record<string, string> = {};
      attStatusSnap.forEach(doc => {
        attStatusMap[doc.id] = doc.data().name || "";
      });
      setAttendanceStatuses(attStatusMap);

      const adjStatusSnap = await getDocs(collection(db, "eventAdjustStatus"));
      const adjStatusMap: Record<string, string> = {};
      adjStatusSnap.forEach(doc => {
        adjStatusMap[doc.id] = doc.data().name || "";
      });
      setAdjustStatuses(adjStatusMap);

      // 2. 出欠回答を取得
      const attAnswersSnap = await getDocs(
        query(collection(db, "eventAttendanceAnswers"), where("uid", "==", uid))
      );
      const attMap: Record<string, string> = {};
      attAnswersSnap.forEach(doc => {
        const data = doc.data();
        if (data.eventId) {
          attMap[data.eventId] = data.status || "";
        }
      });
      setMyAttendanceAnswers(attMap);

      // 3. 日程調整回答を取得
      const adjAnswersSnap = await getDocs(
        query(collection(db, "eventAdjustAnswers"), where("uid", "==", uid))
      );
      const adjMap: Record<string, Record<string, string>> = {};
      adjAnswersSnap.forEach(doc => {
        const data = doc.data();
        if (data.eventId) {
          adjMap[data.eventId] = data.answers || {};
        }
      });
      setMyAdjustAnswers(adjMap);
    };

    loadMyAnswers().catch(console.error);
  }, [uid]);

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

  const renderStatusCell = (e: Event, type: "schedule" | "future" | "closed") => {
    const isSchedule = e.attendanceType === "schedule";
    const hasAttended = myAttendanceAnswers[e.id];
    const hasAdjusted = myAdjustAnswers[e.id] && Object.keys(myAdjustAnswers[e.id]).length > 0;

    const inTerm = isInTerm(e.acceptStartDate, e.acceptEndDate);
    const isPast = type === "closed";

    // 1. 回答データの選定（第一優先はメイン種別、第二優先はサブ種別）
    let displayAnswer: "attendance" | "adjust" | null = null;
    if (isSchedule) {
      if (hasAdjusted) {
        displayAnswer = "adjust";
      } else if (hasAttended) {
        displayAnswer = "attendance";
      }
    } else {
      if (hasAttended) {
        displayAnswer = "attendance";
      } else if (hasAdjusted) {
        displayAnswer = "adjust";
      }
    }

    // 2. 回答済みの表示
    if (displayAnswer === "attendance") {
      const statusName = attendanceStatuses[hasAttended] || "回答済";
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
          <span className="answer-status answered" style={{ backgroundColor: "#3182ce", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold" }}>回答済</span>
          <span style={{ fontSize: "0.75rem", color: "#2d3748", fontWeight: "bold" }}>{statusName}</span>
        </div>
      );
    }

    if (displayAnswer === "adjust") {
      const answersMap = myAdjustAnswers[e.id] || {};
      
      // 候補日程の復元（イベント側に candidateDates がない場合）
      let candidateDates = e.candidateDates || [];
      if (candidateDates.length === 0) {
        candidateDates = Object.keys(answersMap).sort();
      }

      const summaryList = candidateDates.map(d => {
        const parts = d.split(".");
        const monthDay = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
        const statusId = answersMap[d];
        const statusName = adjustStatuses[statusId] || "-";
        return `${monthDay}: ${statusName}`;
      });

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
          <span className="answer-status answered" style={{ backgroundColor: "#3182ce", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold" }}>回答済</span>
          <div style={{ fontSize: "0.7rem", color: "#4a5568", lineHeight: "1.2", whiteSpace: "nowrap", textAlign: "left" }}>
            {summaryList.map((str, idx) => <div key={idx}>{str}</div>)}
          </div>
        </div>
      );
    }

    // 3. 未回答の表示
    if (isPast) {
      return <span className="answer-status closed">終了</span>;
    }
    if (!inTerm) {
      return <span className="answer-status closed">期間外</span>;
    }
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
          <h3><i className="fa-solid fa-calendar-days" style={{ marginRight: "0.5rem" }} />日程調整中</h3>
          <div className="table-wrapper">
            <table className="list-table">
              <thead>
                <tr>
                  <th>イベント名</th>
                  <th>候補日</th>
                  <th>回答</th>
                  <th>日程調整<br />受付期間</th>
                  <th>都道府県<br />市区町村</th>
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
                    <td className="text-small">
                      {e.prefectureId ? (prefNamesMap[e.prefectureId] || "不明") : "-"}<br />
                      {e.municipalityId ? (munNamesMap[e.municipalityId] || "不明") : "-"}
                    </td>
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
        <h3><i className="fa-solid fa-calendar-check" style={{ marginRight: "0.5rem" }} />今後の予定</h3>
        <div className="table-wrapper">
          <table className="list-table">
            <thead>
              <tr>
                <th>イベント名</th>
                <th>日付</th>
                <th>回答</th>
                <th>出欠受付期間</th>
                <th>都道府県<br />市区町村</th>
                <th>場所</th>
              </tr>
            </thead>
            <tbody>
              {futureList.length === 0 ? (
                <tr><td colSpan={6} className="empty-text">該当のイベントはありません🍀</td></tr>
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
                    <td className="text-small">
                      {e.prefectureId ? (prefNamesMap[e.prefectureId] || "不明") : "-"}<br />
                      {e.municipalityId ? (munNamesMap[e.municipalityId] || "不明") : "-"}
                    </td>
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
          <h3><i className="fa-solid fa-clock-rotate-left" style={{ marginRight: "0.5rem" }} />終了</h3>
          <div className="table-wrapper">
            <table className="list-table">
              <thead>
                <tr>
                  <th>イベント名</th>
                  <th>日付</th>
                  <th>状況</th>
                  <th>出欠受付期間</th>
                  <th>都道府県<br />市区町村</th>
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
                    <td>{renderStatusCell(e, "closed")}</td>
                    <td className="text-small">{renderTermDisplay(e)}</td>
                    <td className="text-small">
                      {e.prefectureId ? (prefNamesMap[e.prefectureId] || "不明") : "-"}<br />
                      {e.municipalityId ? (munNamesMap[e.municipalityId] || "不明") : "-"}
                    </td>
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
