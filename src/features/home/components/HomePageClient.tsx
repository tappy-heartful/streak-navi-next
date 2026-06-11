"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import Link from "next/link";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useAuth } from "@/src/contexts/AuthContext";
import * as utils from "@/src/lib/functions";
import styles from "./home.module.css";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import type { Announcement, Score, BlueNote, Media, Event as FirestoreEvent, Vote, Call } from "@/src/lib/firestore/types";
import { InstagramEmbed } from "@/src/components/InstagramEmbed";
import { getPersonalSettlementSummaryAction } from "@/src/features/accounting/api/accounting-server-actions";
import { PersonalSettlementCard } from "@/src/features/accounting/components/PersonalSettlementCard";
import { AccountingSeason, AccountingSeasonKey } from "@/src/lib/firestore/types";

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
      <MenuSection title="アプリメニュー" items={[{ h: "/user", l: "fa-solid fa-users ユーザ", c: "appMenu" }, { h: "/notice", l: "fa-solid fa-bell 通知設定", c: "appMenu" }, { h: "/blue-note", l: "fa-solid fa-record-vinyl 今日の一曲", c: "appMenu", b: "募集中" }, { h: "/board", l: "fa-solid fa-clipboard-list 掲示板", c: "appMenu" }, { h: "/issue", l: "fa-solid fa-list-check イシュー", c: "appMenu" }]} />
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

const CalendarSection = memo(({ data }: { data: { events: FirestoreEvent[], votes: Vote[], calls: Call[] } }) => {
  const nowJst = utils.getJSTDate();
  const todayYear = nowJst.getUTCFullYear();
  const todayMonth = nowJst.getUTCMonth();
  const todayDay = nowJst.getUTCDate();
  const [currentDate, setCurrentDate] = useState(() => new Date(todayYear, todayMonth, 1));
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [holidays, setHolidays] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("https://holidays-jp.github.io/api/v1/date.json")
      .then(res => res.json())
      .then(data => setHolidays(data))
      .catch(err => console.error("Failed to fetch holidays:", err));
  }, []);

  // スワイプの閾値（ピクセル）
  const minSwipeDistance = 50;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const years = [];
  for (let y = todayYear - 1; y <= todayYear + 2; y++) years.push(y);
  const months = Array.from({ length: 12 }, (_, i) => i);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(parseInt(e.target.value), month, 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(year, parseInt(e.target.value), 1));
  };

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

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

  const getItemsForDay = (day: number) => {
    const dateStr = `${year}.${String(month + 1).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
    const items: { type: 'event' | 'vote' | 'call', label: string, link: string, id: string, position?: 'start' | 'middle' | 'end' }[] = [];
    const dayOfWeek = new Date(year, month, day).getDay();
    const isSunday = dayOfWeek === 0;

    data.events.forEach(e => {
      if (e.date === dateStr) {
        items.push({ type: 'event', label: `📅 ${e.title}`, link: `/event/confirm?eventId=${e.id}`, id: e.id });
      } else if (e.candidateDates?.includes(dateStr)) {
        items.push({ type: 'event', label: `🗓️ ${e.title}`, link: `/event/confirm?eventId=${e.id}`, id: e.id });
      }
    });

    data.votes.forEach(v => {
      const isStart = v.acceptStartDate === dateStr;
      const isEnd = v.acceptEndDate === dateStr;
      const isInPeriod = v.acceptStartDate <= dateStr && dateStr <= v.acceptEndDate;

      if (isInPeriod) {
        const label = (isStart || isSunday) ? `📊 ${v.name}` : "";
        items.push({
          type: 'vote',
          label,
          link: `/vote/confirm?voteId=${v.id}`,
          id: v.id,
          position: isStart ? 'start' : isEnd ? 'end' : 'middle'
        });
      }
    });

    data.calls.forEach(c => {
      const isStart = c.acceptStartDate === dateStr;
      const isEnd = c.acceptEndDate === dateStr;
      const isInPeriod = c.acceptStartDate <= dateStr && dateStr <= c.acceptEndDate;

      if (isInPeriod) {
        const label = (isStart || isSunday) ? `🎶 ${c.title}` : "";
        items.push({
          type: 'call',
          label,
          link: `/call/confirm?callId=${c.id}`,
          id: c.id,
          position: isStart ? 'start' : isEnd ? 'end' : 'middle'
        });
      }
    });

    return items;
  };

  return (
    <main className="container">
      <section className={styles.calendarContainer}>
        <div>
          <h3>カレンダー</h3>
        </div>
        <div className={styles.calendarHeader}>
          <div className={styles.calendarNav}>
            <button onClick={handlePrevMonth} className={styles.navButtonIcon}>
              <i className="fa-solid fa-chevron-left" />
            </button>
            <div className={styles.calendarSelectors}>
              <select value={year} onChange={handleYearChange}>
                {years.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
              <select value={month} onChange={handleMonthChange}>
                {months.map(m => <option key={m} value={m}>{m + 1}月</option>)}
              </select>
            </div>
            <button onClick={handleNextMonth} className={styles.navButtonIcon}>
              <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        </div>
        <div
          className={styles.calendarGrid}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {['日', '月', '火', '水', '木', '金', '土'].map(d => (
            <div key={d} className={styles.weekdayHeader}>{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className={styles.calendarDayEmpty} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const items = getItemsForDay(day);
            const isToday = todayYear === year && todayMonth === month && todayDay === day;
            
            const dateObj = new Date(year, month, day);
            const dayOfWeek = dateObj.getDay();
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isHoliday = !!holidays[dateStr];
            const holidayName = holidays[dateStr] || "";

            let dayClass = "";
            if (isToday) {
              dayClass = styles.today;
            } else if (isHoliday || isSunday) {
              dayClass = styles.holiday;
            } else if (isSaturday) {
              dayClass = styles.saturday;
            }

            return (
              <div
                key={day}
                className={`${styles.calendarDay} ${dayClass}`}
                title={holidayName}
              >
                <div className={styles.dayNumber}>{day}</div>
                <div className={styles.dayItems}>
                  {items.map((item, idx) => (
                    <Link
                      key={`${item.type}-${item.id}-${idx}`}
                      href={item.link}
                      className={`${styles.calendarItem} ${styles[item.type]} ${item.position ? styles[item.position] : ""}`}
                    >
                      {item.label ? truncate(item.label, 13) : "\u00A0"}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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