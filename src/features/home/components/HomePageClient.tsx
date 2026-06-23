"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import Link from "next/link";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useAuth } from "@/src/contexts/AuthContext";
import * as utils from "@/src/lib/functions";
import styles from "./home.module.css";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import type { Announcement, Score, BlueNote, Media, Event as FirestoreEvent, Vote, Call, Issue } from "@/src/lib/firestore/types";
import { InstagramEmbed } from "@/src/components/InstagramEmbed";
import { getPersonalSettlementSummaryAction } from "@/src/features/accounting/api/accounting-server-actions";
import { PersonalSettlementCard } from "@/src/features/accounting/components/PersonalSettlementCard";
import { AccountingSeason, AccountingSeasonKey } from "@/src/lib/firestore/types";
import { hasViewPermission } from "@/src/features/issue/lib/issue-search-engine";
import { db } from "@/src/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { DailyAgendaModal } from "./DailyAgendaModal";

// --- 再描画させないためのメモ化コンポーネント群 ---

const AnnouncementSection = memo(({ data }: { data: Announcement[] }) => (
  <main className="container">
    <section className={styles.announcementContainer}>
      <div className={styles.announcementHeader}>
        <h3>お知らせ</h3>
      </div>
      <ul className={styles.notificationList}>
        {data.map((a, i) => (
          <li key={i}>
            {a.type === "item" ? (
              <Link prefetch={true} href={a.link || "#"} className={styles.notificationLink}>
                {a.label}
              </Link>
            ) : a.type === "pending" ? (
              <div className={styles.pendingMessage}>
                {a.message}
              </div>
            ) : (
              <div className={styles.emptyMessage}>
                {a.message || "お知らせはありません🍀"}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  </main>
));
AnnouncementSection.displayName = "AnnouncementSection";

const TodoSection = memo(({ todos }: { todos: Issue[] }) => {
  if (todos.length === 0) return null;

  const todayStr = utils.format(new Date(), "yyyy.MM.dd");
  const todayJstStr = utils.format(new Date(), "yyyy-MM-dd");
  const todayMidnight = new Date(`${todayJstStr}T00:00:00+09:00`).getTime();

  const getTypeName = (type: string) => {
    switch (type) {
      case "todo": return "TODO";
      case "bug": return "課題";
      case "question": return "質問";
      case "proposal": return "提案";
      case "request": return "要望";
      default: return type;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "todo": return styles.todoBadgeTodo;
      case "bug": return styles.todoBadgeBug;
      case "question": return styles.todoBadgeQuestion;
      case "proposal": return styles.todoBadgeProposal;
      case "request": return styles.todoBadgeRequest;
      default: return "";
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case "not_started": return "未実施";
      case "in_progress": return "実施中";
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "not_started":
      case "in_progress":
      default:
        return styles.todoStatusInProgress;
    }
  };

  return (
    <main className="container">
      <div className={styles.todoContainer}>
        <div className={styles.todoHeader}>
          <h3>
            <i className={`fa-solid fa-list-check ${styles.todoHeaderIcon}`} />
            TODO ({todos.length}件)
          </h3>
        </div>
        <div className={styles.todoCard}>
          <ul className={styles.todoList}>
            {todos.map((todo) => {
              const isOverdue = todo.date && todo.date < todayStr;
              let remainingLabel = "";
              if (todo.date) {
                const todoJstStr = todo.date.replace(/\./g, "-");
                const todoMidnight = new Date(`${todoJstStr}T00:00:00+09:00`).getTime();
                const diffDays = Math.round((todoMidnight - todayMidnight) / 86400000);
                if (diffDays > 0) {
                  remainingLabel = `あと ${diffDays} 日`;
                } else if (diffDays === 0) {
                  remainingLabel = "今日まで";
                } else {
                  remainingLabel = "期限超過";
                }
              }

              return (
                <li key={todo.id}>
                  <Link href={`/issue/confirm?issueId=${todo.id}`} className={styles.todoItem}>
                    <div className={styles.todoItemContent}>
                      <div className={styles.todoItemTitleRow}>
                        <span className={`${styles.todoBadge} ${getTypeBadgeClass(todo.type)}`}>
                          {getTypeName(todo.type)}
                        </span>
                        <span className={`${styles.todoStatusBadge} ${getStatusBadgeClass(todo.status)}`}>
                          {getStatusName(todo.status)}
                        </span>
                        <span className={styles.todoItemTitle}>{todo.title}</span>
                      </div>
                      <div className={styles.todoItemMeta}>
                        {todo.date ? (
                          <span className={`${styles.todoDate} ${isOverdue ? styles.todoDateOverdue : ""}`}>
                            <i className="fa-regular fa-clock" />
                            {todo.date} {todo.dateType === "until" ? "まで" : "に"}
                            <span className={styles.todoRemaining}>
                              {isOverdue && <i className="fa-solid fa-triangle-exclamation" />}
                              {remainingLabel}
                            </span>
                          </span>
                        ) : (
                          <span className={styles.todoDate}>
                            <i className="fa-regular fa-clock" /> 期限なし
                          </span>
                        )}
                      </div>
                    </div>
                    <i className={`fa-solid fa-chevron-right ${styles.todoChevron}`} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </main>
  );
});
TodoSection.displayName = "TodoSection";

type MenuItem = { h: string; l: string; c: string; b?: string | number };
const MenuSection = ({ title, items }: { title: string; items: MenuItem[] }) => (
  <>
    <h2 className={styles.menuTitle}>{title}</h2>
    {items.map((item) => {
      const parts = item.l.split(" ");
      const hasIcon = parts.length > 1 && parts[0].startsWith("fa-");
      const iconClass = hasIcon ? `${parts[0]} ${parts[1]}` : null;
      const label = hasIcon ? parts.slice(2).join(" ") : item.l;

      return (
        <Link prefetch={true} key={item.h} href={item.h} className={`${styles.menuButton} ${styles[item.c]} ${item.b ? styles.badgeInline : ""}`}>
          {iconClass ? <><i className={iconClass} style={{ marginRight: "0.5rem" }} />{label}</> : item.l}
          {item.b && <span className={styles.badge}>{item.b}</span>}
        </Link>
      );
    })}
  </>
);

const MenuSectionList = memo(({ isAdmin }: { isAdmin: boolean }) => (
  <main className="container">
    <h3><i className="fa-solid fa-bars" style={{ marginRight: "0.5rem" }} />メニュー</h3>
    <div className={styles.menuList}>
      <MenuSection title="演奏メニュー" items={[{ h: "/score", l: "fa-solid fa-music 譜面", c: "perfMenu" }, { h: "/event", l: "fa-solid fa-calendar-days イベント", c: "perfMenu" }, { h: "/assign", l: "fa-solid fa-people-group 譜割り", c: "perfMenu" }]} />
      <MenuSection title="活動メニュー" items={[{ h: "/call", l: "fa-solid fa-bullhorn 曲募集", c: "actMenu" }, { h: "/vote", l: "fa-solid fa-check-to-slot 曲投票", c: "actMenu" }, { h: "/studio", l: "fa-solid fa-location-dot スタジオ", c: "actMenu" }]} />
      <MenuSection title="アプリメニュー" items={[{ h: "/user", l: "fa-solid fa-users ユーザ", c: "appMenu" }, { h: "/notice", l: "fa-solid fa-bell 通知設定", c: "appMenu" }, { h: "/blue-note", l: "fa-solid fa-record-vinyl 今日の一曲", c: "appMenu", b: "募集中" }, { h: "/board", l: "fa-solid fa-clipboard-list 掲示板", c: "appMenu" }, { h: "/issue", l: "fa-solid fa-list-check TODO", c: "appMenu" }]} />
      <MenuSection title="ホームページ連携" items={[{ h: "/live", l: "fa-solid fa-guitar ライブ", c: "extMenu" }, { h: "/ticket", l: "fa-solid fa-ticket 予約者一覧", c: "extMenu" }, { h: "/media", l: "fa-solid fa-photo-film メディア", c: "extMenu" }]} />
      <MenuSection title="経費管理" items={[
        { h: "/accounting", l: "fa-solid fa-scale-balanced バランス会計", c: "costMenu" },
        { h: "/travel-subsidy", l: "fa-solid fa-train-subway 旅費補助額", c: "costMenu" },
        { h: "/expense-apply", l: "fa-solid fa-file-invoice-dollar 経費申請", c: "costMenu" },
        ...(isAdmin ? [{ h: "/expense-review", l: "fa-solid fa-clipboard-check 経費審査", c: "costMenu" }] : [])
      ]} />
    </div>
  </main>
));
MenuSectionList.displayName = "MenuSectionList";

const MediaSection = memo(({ data }: { data: Media[] }) => (
  <main className="container">
    <h3><i className="fa-solid fa-photo-film" style={{ marginRight: "0.5rem" }} />メディア</h3>
    <div className={styles.contentList}>
      {data.length ? data.map(m => (
        <div key={m.id} className={styles.contentItem}>
          <h4>{m.title}</h4>
          <div className={styles.mediaDate}>{m.date}</div>
          {m.instagramUrl && <InstagramEmbed url={m.instagramUrl} />}
          {m.youtubeUrl && <div dangerouslySetInnerHTML={{ __html: utils.buildYouTubeHtml(m.youtubeUrl, true, true) }} />}
          {m.driveUrl && <div dangerouslySetInnerHTML={{ __html: utils.buildGoogleDriveHtml(m.driveUrl, true) }} />}
        </div>
      )) : <div className={styles.contentItem}>メディアはまだ登録されていません🍀</div>}
    </div>
  </main>
));
MediaSection.displayName = "MediaSection";

const Player = memo(({ title, subtitle, data, idx, setIdx, onRandom }: { title?: string; subtitle?: string; data: (Score | BlueNote)[]; idx: number; setIdx: React.Dispatch<React.SetStateAction<number>>; onRandom: () => void }) => (
  <div>
    <h2 className={styles.playerTitle}>
      {subtitle && <div style={{ fontSize: "14px", color: "#4caf50", marginBottom: "4px", fontWeight: "normal" }}>{subtitle}</div>}
      {title}
    </h2>
    <div dangerouslySetInnerHTML={{ __html: utils.buildYouTubeHtml(utils.getWatchVideosOrder(idx, data), false) }} />
    <div className={styles.playerControls}>
      <button onClick={() => setIdx((idx - 1 + data.length) % data.length)} className={styles.playerControl}><i className="fa-solid fa-backward-step"></i></button>
      <button onClick={onRandom} className={styles.playerControl}>ランダム <i className="fa-solid fa-arrows-rotate"></i></button>
      <button onClick={() => setIdx((idx + 1) % data.length)} className={styles.playerControl}><i className="fa-solid fa-forward-step"></i></button>
    </div>
  </div>
));
Player.displayName = "Player";

const CalendarSection = memo(({ data }: { data: { events: FirestoreEvent[], votes: Vote[], calls: Call[], issues: Issue[] } }) => {
  const { userData } = useAuth();
  const uid = userData?.id;

  const nowJst = utils.getJSTDate();
  const todayYear = nowJst.getUTCFullYear();
  const todayMonth = nowJst.getUTCMonth();
  const todayDay = nowJst.getUTCDate();
  const [currentDate, setCurrentDate] = useState(() => new Date(todayYear, todayMonth, 1));
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [holidays, setHolidays] = useState<Record<string, string>>({});

  // フィルター用状態
  const [scopeFilter, setScopeFilter] = useState<'all' | 'my'>('all');

  // アジェンダモーダル表示用状態
  const [activeDateStr, setActiveDateStr] = useState<string>("");
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);

  const handleCellClick = (cellYear: number, cellMonth: number, dayNum: number) => {
    const dateStr = `${cellYear}.${String(cellMonth + 1).padStart(2, '0')}.${String(dayNum).padStart(2, '0')}`;
    setActiveDateStr(dateStr);
    setIsAgendaOpen(true);
  };

  // 自分の回答・出欠状況の管理
  const [myAttendanceAnswers, setMyAttendanceAnswers] = useState<Record<string, { statusId: string; statusName: string }>>({});
  const [myAdjustEventIds, setMyAdjustEventIds] = useState<Set<string>>(new Set());
  const [myVoteIds, setMyVoteIds] = useState<Set<string>>(new Set());
  const [myCallIds, setMyCallIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("https://holidays-jp.github.io/api/v1/date.json")
      .then(res => res.json())
      .then(data => setHolidays(data))
      .catch(err => console.error("Failed to fetch holidays:", err));
  }, []);

  useEffect(() => {
    if (!uid) return;
    const fetchUserData = async () => {
      try {
        // 1. 出欠ステータスマスタの取得
        const statusesSnap = await getDocs(collection(db, "attendanceStatuses"));
        const statusMap: Record<string, string> = {};
        statusesSnap.forEach(doc => {
          statusMap[doc.id] = doc.data().name || "";
        });

        // 2. 自分のイベント出欠回答の取得
        const attSnap = await getDocs(query(collection(db, "eventAttendanceAnswers"), where("uid", "==", uid)));
        const attAnswers: Record<string, { statusId: string; statusName: string }> = {};
        attSnap.forEach(doc => {
          const d = doc.data();
          if (d.eventId && d.status) {
            attAnswers[d.eventId] = {
              statusId: d.status,
              statusName: statusMap[d.status] || ""
            };
          }
        });
        setMyAttendanceAnswers(attAnswers);

        // 3. 自分のイベント日程調整回答の取得
        const adjSnap = await getDocs(query(collection(db, "eventAdjustAnswers"), where("uid", "==", uid)));
        const adjIds = new Set<string>();
        adjSnap.forEach(doc => {
          const d = doc.data();
          if (d.eventId) adjIds.add(d.eventId);
        });
        setMyAdjustEventIds(adjIds);

        // 4. 自分の曲投票回答の取得
        const voteSnap = await getDocs(query(collection(db, "voteAnswers"), where("uid", "==", uid)));
        const vIds = new Set<string>();
        voteSnap.forEach(doc => {
          const d = doc.data();
          if (d.voteId) vIds.add(d.voteId);
        });
        setMyVoteIds(vIds);

        // 5. 自分の曲募集回答の取得
        const callSnap = await getDocs(query(collection(db, "callAnswers"), where("uid", "==", uid)));
        const cIds = new Set<string>();
        callSnap.forEach(doc => {
          const parts = doc.id.split("_");
          if (parts[0]) cIds.add(parts[0]);
        });
        setMyCallIds(cIds);
      } catch (e) {
        console.error("Failed to load user answers for calendar filtering:", e);
      }
    };
    fetchUserData();
  }, [uid]);



  // スワイプの閾値（ピクセル）
  const minSwipeDistance = 50;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return m === 0 ? new Date(y - 1, 11, 1) : new Date(y, m - 1, 1);
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return m === 11 ? new Date(y + 1, 0, 1) : new Date(y, m + 1, 1);
    });
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date(todayYear, todayMonth, 1));
  };

  const gridCells = useMemo(() => {
    const cells = [];
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

    // Padding previous month's trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        dayNum: daysInPrevMonth - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
      });
    }

    // Current month's days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      cells.push({
        dayNum: i,
        month: month,
        year: year,
        isCurrentMonth: true,
      });
    }

    // Padding next month's leading days to make a full 42 grid
    const remaining = 42 - cells.length;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        dayNum: i,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [year, month]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextMonth();
    } else if (isRightSwipe) {
      handlePrevMonth();
    }
  };

  const truncate = (str: string, len: number) => {
    if (!str) return "";
    return str.length <= len ? str : str.slice(0, len) + "...";
  };

  const getItemsForDay = (cellYear: number, cellMonth: number, day: number) => {
    const dateStr = `${cellYear}.${String(cellMonth + 1).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
    const items: {
      type: 'event' | 'vote' | 'call' | 'issue' | 'schedule_adjust',
      iconClass?: string,
      label: string,
      link: string,
      id: string,
      status?: string,
      position?: 'start' | 'middle' | 'end',
      createdBy?: string,
      assigneeId?: string
    }[] = [];
    const dayOfWeek = new Date(cellYear, cellMonth, day).getDay();
    const isSunday = dayOfWeek === 0;

    const todayStr = `${todayYear}.${String(todayMonth + 1).padStart(2, '0')}.${String(todayDay).padStart(2, '0')}`;

    // イベント
    data.events.forEach(e => {
      if (scopeFilter === 'my') {
        const hasResponded = !!(myAttendanceAnswers[e.id] || myAdjustEventIds.has(e.id));
        const isCreatedByMe = e.createdBy === uid;
        const isFutureOrToday = e.date ? e.date >= todayStr : (e.candidateDates?.some(d => d >= todayStr) ?? false);
        
        let show = false;
        if (isCreatedByMe) {
          show = true;
        } else if (hasResponded) {
          const ans = myAttendanceAnswers[e.id];
          const isAbsent = ans && (ans.statusName.includes("欠席") || ans.statusName === "欠" || ans.statusName === "Absent");
          if (!isAbsent) {
            show = true;
          }
        } else if (isFutureOrToday) {
          show = true;
        }
        if (!show) return;
      }

      if (e.date === dateStr) {
        items.push({
          type: 'event',
          iconClass: 'fa-solid fa-calendar-days',
          label: e.title,
          link: `/event/confirm?eventId=${e.id}`,
          id: e.id,
          createdBy: e.createdBy
        });
      } else if (e.candidateDates?.includes(dateStr)) {
        items.push({
          type: 'event',
          iconClass: 'fa-regular fa-calendar',
          label: e.title,
          link: `/event/confirm?eventId=${e.id}`,
          id: e.id,
          createdBy: e.createdBy
        });
      }
    });

    // イベント日程調整の受付期間
    data.events.forEach(e => {
      if (e.attendanceType !== "schedule") return;
      if (!e.acceptStartDate || !e.acceptEndDate) return;

      if (scopeFilter === 'my') {
        const hasResponded = myAdjustEventIds.has(e.id);
        const isCreatedByMe = e.createdBy === uid;
        const isActive = e.acceptStartDate <= todayStr && todayStr <= e.acceptEndDate;
        
        const show = isCreatedByMe || hasResponded || isActive;
        if (!show) return;
      }

      const isStart = e.acceptStartDate === dateStr;
      const isEnd = e.acceptEndDate === dateStr;
      const isInPeriod = e.acceptStartDate <= dateStr && dateStr <= e.acceptEndDate;

      if (isInPeriod) {
        const label = (isStart || isSunday) ? `調整: ${e.title}` : "";
        items.push({
          type: 'schedule_adjust',
          iconClass: label ? 'fa-solid fa-calendar-days' : undefined,
          label,
          link: `/event/confirm?eventId=${e.id}`,
          id: e.id,
          position: isStart ? 'start' : isEnd ? 'end' : 'middle',
          createdBy: e.createdBy
        });
      }
    });

    // 曲投票 (投票 & 募集)
    data.votes.forEach(v => {
      if (scopeFilter === 'my') {
        const hasResponded = myVoteIds.has(v.id);
        const isCreatedByMe = v.createdBy === uid;
        const isActive = v.acceptStartDate <= todayStr && todayStr <= v.acceptEndDate;
        
        const show = isCreatedByMe || hasResponded || isActive;
        if (!show) return;
      }

      const isStart = v.acceptStartDate === dateStr;
      const isEnd = v.acceptEndDate === dateStr;
      const isInPeriod = v.acceptStartDate <= dateStr && dateStr <= v.acceptEndDate;

      if (isInPeriod) {
        const label = (isStart || isSunday) ? v.name : "";
        items.push({
          type: 'vote',
          iconClass: label ? 'fa-solid fa-check-to-slot' : undefined,
          label,
          link: `/vote/confirm?voteId=${v.id}`,
          id: v.id,
          position: isStart ? 'start' : isEnd ? 'end' : 'middle',
          createdBy: v.createdBy
        });
      }
    });

    data.calls.forEach(c => {
      if (scopeFilter === 'my') {
        const hasResponded = myCallIds.has(c.id);
        const isCreatedByMe = c.createdBy === uid;
        const isActive = c.acceptStartDate <= todayStr && todayStr <= c.acceptEndDate;
        
        const show = isCreatedByMe || hasResponded || isActive;
        if (!show) return;
      }

      const isStart = c.acceptStartDate === dateStr;
      const isEnd = c.acceptEndDate === dateStr;
      const isInPeriod = c.acceptStartDate <= dateStr && dateStr <= c.acceptEndDate;

      if (isInPeriod) {
        const label = (isStart || isSunday) ? c.title : "";
        items.push({
          type: 'call',
          iconClass: label ? 'fa-solid fa-bullhorn' : undefined,
          label,
          link: `/call/confirm?callId=${c.id}`,
          id: c.id,
          position: isStart ? 'start' : isEnd ? 'end' : 'middle',
          createdBy: c.createdBy
        });
      }
    });

    // TODO (イシュー)
    if (data.issues) {
      data.issues.forEach(issue => {
        if (!hasViewPermission(issue, userData)) return;

        if (scopeFilter === 'my') {
          if (issue.assigneeId !== uid && issue.createdBy !== uid) return;
        }

        if (issue.date === dateStr) {
          const iconClass = issue.type === 'bug'
            ? 'fa-solid fa-bug'
            : issue.type === 'question'
              ? 'fa-solid fa-circle-question'
              : issue.type === 'proposal'
                ? 'fa-regular fa-lightbulb'
                : issue.type === 'request'
                  ? 'fa-regular fa-comments'
                  : (issue.status === 'completed' ? 'fa-solid fa-square-check' : 'fa-regular fa-square-check');
          items.push({
            type: 'issue',
            iconClass,
            label: issue.title,
            link: `/issue/confirm?issueId=${issue.id}`,
            id: issue.id,
            status: issue.status,
            assigneeId: issue.assigneeId,
            createdBy: issue.createdBy
          });
        }
      });
    }

    return items;
  };

  return (
    <main className="container">
      <section className={styles.calendarContainer}>
        <div className={styles.calendarHeader}>
          <div className={styles.monthLabel}>
            <i className="fa-solid fa-calendar-days" style={{ color: "#4caf50" }}></i>
            {year}年{month + 1}月
          </div>
          <div className={styles.headerBtns}>
            <button type="button" className={styles.todayBtn} onClick={handleGoToToday}>
              今日
            </button>
            <button type="button" className={styles.navBtn} onClick={handlePrevMonth} aria-label="前月">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button type="button" className={styles.navBtn} onClick={handleNextMonth} aria-label="次月">
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>

        {/* フィルターセクション */}
        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>表示対象:</span>
            <div className={styles.toggleButtonGroup}>
              <button 
                type="button"
                className={`${styles.filterButton} ${scopeFilter === 'all' ? styles.activeScope : ''}`}
                onClick={() => setScopeFilter('all')}
              >
                全体
              </button>
              <button 
                type="button"
                className={`${styles.filterButton} ${scopeFilter === 'my' ? styles.activeScope : ''}`}
                onClick={() => setScopeFilter('my')}
              >
                自分のもの
              </button>
            </div>
          </div>
          
          <div className={styles.legendGroup}>
            <span className={`${styles.legendItem} ${styles.legendEvent}`}><i className="fa-solid fa-calendar-days" /> イベント</span>
            <span className={`${styles.legendItem} ${styles.legendScheduleAdjust}`}><i className="fa-solid fa-calendar-days" /> 日程調整</span>
            <span className={`${styles.legendItem} ${styles.legendVote}`}><i className="fa-solid fa-check-to-slot" /> 曲投票</span>
            <span className={`${styles.legendItem} ${styles.legendCall}`}><i className="fa-solid fa-bullhorn" /> 曲募集</span>
            <span className={`${styles.legendItem} ${styles.legendTodo}`}><i className="fa-regular fa-square-check" /> TODO</span>
            <span className={`${styles.legendItem} ${styles.legendAbsent}`}><i className="fa-solid fa-calendar-xmark" /> 欠席</span>
          </div>
        </div>

        <div className={styles.weekdaysHeader}>
          <div className={`${styles.weekday} ${styles.weekdaySunday}`}>日</div>
          <div className={styles.weekday}>月</div>
          <div className={styles.weekday}>火</div>
          <div className={styles.weekday}>水</div>
          <div className={styles.weekday}>木</div>
          <div className={styles.weekday}>金</div>
          <div className={`${styles.weekday} ${styles.weekdaySaturday}`}>土</div>
        </div>

        <div
          className={styles.daysGrid}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {gridCells.map((cell, idx) => {
            const items = getItemsForDay(cell.year, cell.month, cell.dayNum);
            const isToday = todayYear === cell.year && todayMonth === cell.month && todayDay === cell.dayNum;
            
            const cellDayOfWeek = idx % 7; // 0 = Sunday, 6 = Saturday
            const dateStr = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.dayNum).padStart(2, "0")}`;
            const isHoliday = !!holidays[dateStr];
            const holidayName = holidays[dateStr] || "";

            let dayClass = "";
            if (isToday) {
              dayClass = styles.today;
            } else if (isHoliday || cellDayOfWeek === 0) {
              dayClass = styles.holiday;
            } else if (cellDayOfWeek === 6) {
              dayClass = styles.saturday;
            }

            if (!cell.isCurrentMonth) {
              dayClass += ` ${styles.otherMonthDay}`;
            }

            return (
              <div
                key={`${cell.year}-${cell.month}-${cell.dayNum}-${idx}`}
                className={`${styles.calendarDay} ${dayClass}`}
                title={holidayName}
                onClick={() => handleCellClick(cell.year, cell.month, cell.dayNum)}
              >
                <div className={styles.dayHeader}>
                  <span
                    className={`${styles.dayNumber} ${
                      isToday
                        ? styles.todayCircle
                        : (cellDayOfWeek === 0 || isHoliday)
                          ? styles.sundayNumber
                          : cellDayOfWeek === 6
                            ? styles.saturdayNumber
                            : ""
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                </div>
                <div className={styles.eventsContainer}>
                  {items.map((item, idx) => {
                    const isCompleted = item.type === 'issue' && item.status === 'completed';
                    let pillClass = "";

                    if (item.type === 'issue') {
                      pillClass = styles.todoMe; // ティール (todoMe)

                      return (
                        <span
                          key={`${item.type}-${item.id}-${idx}`}
                          className={`${styles.todoPill} ${pillClass} ${isCompleted ? styles.completed : ""}`}
                        >
                          {item.iconClass && <i className={item.iconClass} style={{ marginRight: "2px" }} />}
                          {item.label ? truncate(item.label, 12) : "\u00A0"}
                        </span>
                      );
                    } else if (item.type === 'event') {
                      const hasResponded = !!myAttendanceAnswers[item.id];
                      const isAbsent = hasResponded && (myAttendanceAnswers[item.id].statusName.includes("欠席") || myAttendanceAnswers[item.id].statusName === "欠" || myAttendanceAnswers[item.id].statusName === "Absent");
                      
                      if (isAbsent) {
                        pillClass = styles.eventAbsent; // グレーアウト
                      } else {
                        pillClass = styles.eventMeLight; // ブルー (eventMeLight)
                      }

                      return (
                        <span
                          key={`${item.type}-${item.id}-${idx}`}
                          className={`${styles.eventPill} ${pillClass}`}
                        >
                          {item.iconClass && <i className={item.iconClass} style={{ marginRight: "3px" }} />}
                          {item.label ? truncate(item.label, 12) : "\u00A0"}
                        </span>
                      );
                    } else if (item.type === 'schedule_adjust') {
                      pillClass = styles.eventScheduleAdjust; // ソフトアンバー (eventScheduleAdjust)

                      let spanClass = styles.eventPill;
                      if (item.position === 'start') spanClass = `${styles.eventPill} ${styles.eventStart}`;
                      else if (item.position === 'middle') spanClass = `${styles.eventPill} ${styles.eventMiddle}`;
                      else if (item.position === 'end') spanClass = `${styles.eventPill} ${styles.eventEnd}`;

                      return (
                        <span
                          key={`${item.type}-${item.id}-${idx}`}
                          className={`${spanClass} ${pillClass}`}
                        >
                          {item.iconClass && <i className={item.iconClass} style={{ marginRight: "3px" }} />}
                          {item.label ? truncate(item.label, 12) : "\u00A0"}
                        </span>
                      );
                    } else if (item.type === 'vote') {
                      pillClass = styles.eventCoupleLight; // オレンジ (eventCoupleLight)

                      let spanClass = styles.eventPill;
                      if (item.position === 'start') spanClass = `${styles.eventPill} ${styles.eventStart}`;
                      else if (item.position === 'middle') spanClass = `${styles.eventPill} ${styles.eventMiddle}`;
                      else if (item.position === 'end') spanClass = `${styles.eventPill} ${styles.eventEnd}`;

                      return (
                        <span
                          key={`${item.type}-${item.id}-${idx}`}
                          className={`${spanClass} ${pillClass}`}
                        >
                          {item.iconClass && <i className={item.iconClass} style={{ marginRight: "3px" }} />}
                          {item.label ? truncate(item.label, 12) : "\u00A0"}
                        </span>
                      );
                    } else {
                      // call (曲募集)
                      pillClass = styles.eventPartnerLight; // パープル (eventPartnerLight)

                      let spanClass = styles.eventPill;
                      if (item.position === 'start') spanClass = `${styles.eventPill} ${styles.eventStart}`;
                      else if (item.position === 'middle') spanClass = `${styles.eventPill} ${styles.eventMiddle}`;
                      else if (item.position === 'end') spanClass = `${styles.eventPill} ${styles.eventEnd}`;

                      return (
                        <span
                          key={`${item.type}-${item.id}-${idx}`}
                          className={`${spanClass} ${pillClass}`}
                        >
                          {item.iconClass && <i className={item.iconClass} style={{ marginRight: "3px" }} />}
                          {item.label ? truncate(item.label, 12) : "\u00A0"}
                        </span>
                      );
                    }
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {isAgendaOpen && (
          <DailyAgendaModal
            activeDateStr={activeDateStr}
            items={getItemsForDay(
              Number(activeDateStr.split(".")[0]),
              Number(activeDateStr.split(".")[1]) - 1,
              Number(activeDateStr.split(".")[2])
            )}
            onClose={() => setIsAgendaOpen(false)}
          />
        )}
      </section>
    </main>
  );
});
CalendarSection.displayName = "CalendarSection";

// --- メインコンポーネント ---

type InitialData = {
  announcements: Announcement[];
  quickScores: Score[];
  scores: Score[];
  blueNotes: BlueNote[];
  medias: Media[];
  calendarData: {
    events: FirestoreEvent[];
    votes: Vote[];
    calls: Call[];
    issues: Issue[];
  };
};

export function HomePageClient({ initialData }: { initialData: InitialData }) {
  const [currentScoreIdx, setCurrentScoreIdx] = useState(0);
  const [currentBNIdx, setCurrentBNIdx] = useState(0);
  const [settlementSummary, setSettlementSummary] = useState<any>(null);
  const { setBreadcrumbs } = useBreadcrumb();
  const { userData } = useAuth();

  useEffect(() => {
    // ホームに来たらパンくずを空にする
    setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (userData?.id) {
      getPersonalSettlementSummaryAction(userData.id).then(setSettlementSummary);
    }
  }, [userData?.id]);

  useEffect(() => {
    if (initialData.scores.length) {
      setCurrentScoreIdx(Math.floor(Math.random() * Math.min(initialData.scores.length, 6)));
    }
    if (initialData.blueNotes.length) {
      const now = new Date();
      const todayId = utils.format(now, "MMdd");
      const firstDayId = utils.format(now, "MM") + "01";

      const todayIdx = initialData.blueNotes.findIndex((n) => n.id === todayId);
      if (todayIdx !== -1) {
        setCurrentBNIdx(todayIdx);
      } else {
        const firstDayIdx = initialData.blueNotes.findIndex((n) => n.id === firstDayId);
        if (firstDayIdx !== -1) {
          setCurrentBNIdx(firstDayIdx);
        } else {
          // それもなければ月の最初の曲かランダム
          const currentMonthPrefix = utils.format(now, "MM");
          const monthBlueNotesIdx = initialData.blueNotes.findIndex(n => n.id.startsWith(currentMonthPrefix));
          setCurrentBNIdx(monthBlueNotesIdx !== -1 ? monthBlueNotesIdx : Math.floor(Math.random() * initialData.blueNotes.length));
        }
      }
    }
  }, [initialData]);

  const scorePlaylistIds = useMemo(() => initialData.scores.map((s) => s.youtubeId).filter(Boolean).join(","), [initialData.scores]);
  const bnPlaylistIds = useMemo(() => utils.getWatchVideosOrder(currentBNIdx, initialData.blueNotes)?.join(","), [currentBNIdx, initialData.blueNotes]);

  const myIncompleteTodos = useMemo(() => {
    if (!userData || !initialData.calendarData?.issues) return [];
    
    return initialData.calendarData.issues
      .filter((issue) => {
        // Must be uncompleted
        if (issue.status === "completed") return false;
        // Must be assigned to me
        if (issue.assigneeId !== userData.id) return false;
        // Must have view permission
        if (!hasViewPermission(issue, userData)) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by date ascending (soonest deadline first). Empty dates last.
        const dateA = a.date || "9999.12.31";
        const dateB = b.date || "9999.12.31";
        return dateA.localeCompare(dateB);
      });
  }, [userData, initialData.calendarData?.issues]);

  return (
    <BaseLayout>
      <div className={styles.homeContainer}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1><i className="fa-solid fa-house"></i> ホーム</h1>
        </div>
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#888', marginBottom: '20px', fontStyle: 'italic' }}>
          Welcome to Streak Navi.
        </div>

        <AnnouncementSection data={initialData.announcements} />

        <TodoSection todos={myIncompleteTodos} />

        <CalendarSection data={initialData.calendarData} />

        {settlementSummary && (
          <>
            {/* 未精算の過去シーズン（警告付き表示） */}
            {settlementSummary.unpaidPast && settlementSummary.unpaidPast.map((past: any) => (
              <div key={past.season.id} style={{ marginBottom: "20px" }}>
                <div style={{ backgroundColor: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 16px", borderRadius: "8px 8px 0 0", fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
                  <i className="fa-solid fa-triangle-exclamation" />
                  精算が完了していません！お支払い、または精算状況のご確認をお願いします。
                </div>
                <PersonalSettlementCard
                  season={past.season}
                  seasonName={past.seasonName}
                  periodStr={past.periodStr}
                  averageBurden={past.averageBurden}
                  myExpenses={past.myExpenses}
                  myIncomes={past.myIncomes}
                  settlementAmount={past.settlementAmount}
                  isTarget={past.isTarget}
                  seasonKey={past.season.id.split("-")[1] as AccountingSeasonKey}
                  isHome={true}
                  managerName={past.managerName}
                  managerPaypayId={past.managerPaypayId}
                />
              </div>
            ))}

            {/* 現行シーズン */}
            {settlementSummary.current && (
              <PersonalSettlementCard
                season={settlementSummary.current.season}
                seasonName={settlementSummary.current.seasonName}
                periodStr={settlementSummary.current.periodStr}
                averageBurden={settlementSummary.current.averageBurden}
                myExpenses={settlementSummary.current.myExpenses}
                myIncomes={settlementSummary.current.myIncomes}
                settlementAmount={settlementSummary.current.settlementAmount}
                isTarget={settlementSummary.current.isTarget}
                seasonKey={settlementSummary.current.season.id.split("-")[1] as AccountingSeasonKey}
                isHome={true}
                managerName={settlementSummary.current.managerName}
                managerPaypayId={settlementSummary.current.managerPaypayId}
              />
            )}
          </>
        )}

        <main className="container">
          <div className={styles.scoreHeader}>
            <h3><i className="fa-solid fa-music" style={{ marginRight: "0.5rem" }} />新着譜面</h3>
            {scorePlaylistIds && <a href={`https://www.youtube.com/watch_videos?video_ids=${scorePlaylistIds}`} target="_blank" className={styles.playlistButton} rel="noreferrer"><i className="fa-brands fa-youtube"></i> プレイリスト</a>}
          </div>
          <div className={styles.scoreList}>
            {initialData.quickScores.length ? (
              <div className={styles.quickScoreGrid}>
                {initialData.quickScores.map((s) => <Link prefetch={true} key={s.id} href={`/score/confirm?scoreId=${s.id}`} className={styles.quickScoreLink}>🎼 {s.title}</Link>)}
              </div>
            ) : <div className={styles.emptyMessage}>譜面はまだ登録されていません🍀</div>}
          </div>
          {initialData.scores.length > 0 && (
            <Player
              title={initialData.scores[currentScoreIdx]?.title || "参考演奏"}
              data={initialData.scores}
              idx={currentScoreIdx}
              setIdx={setCurrentScoreIdx}
              onRandom={() => setCurrentScoreIdx(utils.getRandomIndex(currentScoreIdx, initialData.scores.length))}
            />
          )}
          <div style={{ textAlign: "center", marginTop: "10px" }}><Link prefetch={true} href="/score" style={{ fontWeight: "bold" }}>もっと見る</Link></div>
        </main>

        <MenuSectionList isAdmin={!!userData?.isSystemAdmin} />

        <main className="container">
          {initialData.blueNotes.length > 0 && (
            <>
              <div className={styles.scoreHeader}>
                <h3><i className="fa-solid fa-record-vinyl" style={{ marginRight: "0.5rem" }} />今日の一曲</h3>
                <a href={`https://www.youtube.com/watch_videos?video_ids=${bnPlaylistIds}`} target="_blank" className={styles.playlistButton} rel="noreferrer"><i className="fa-brands fa-youtube"></i> プレイリスト</a>
              </div>
              <Player
                title={initialData.blueNotes[currentBNIdx]?.title}
                subtitle={initialData.blueNotes[currentBNIdx]?.id ? `${parseInt(initialData.blueNotes[currentBNIdx].id.substring(0, 2))}月${parseInt(initialData.blueNotes[currentBNIdx].id.substring(2))}日の曲` : ""}
                data={initialData.blueNotes}
                idx={currentBNIdx}
                setIdx={setCurrentBNIdx}
                onRandom={() => setCurrentBNIdx(utils.getRandomIndex(currentBNIdx, initialData.blueNotes.length))}
              />
              <div style={{ textAlign: "center", marginTop: "10px" }}><Link prefetch={true} href="/blue-note" style={{ fontWeight: "bold" }}>もっと見る</Link></div>
            </>
          )}
        </main>

        <MediaSection data={initialData.medias} />
      </div>
    </BaseLayout>
  );
}