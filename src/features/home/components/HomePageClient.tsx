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
    {items.map((item) => (
      <Link prefetch={true} key={item.h} href={item.h} className={`${styles.menuButton} ${styles[item.c]} ${item.b ? styles.badgeInline : ""}`}>
        {item.l} {item.b && <span className={styles.badge}>{item.b}</span>}
      </Link>
    ))}
  </>
);

const MenuSectionList = memo(({ isAdmin }: { isAdmin: boolean }) => (
  <main className="container">
    <h3>メニュー</h3>
    <div className={styles.menuList}>
      <MenuSection title="演奏メニュー" items={[{ h: "/score", l: "🎼 譜面", c: "perfMenu" }, { h: "/event", l: "🎺 イベント", c: "perfMenu" }, { h: "/assign", l: "🎵 譜割り", c: "perfMenu" }]} />
      <MenuSection title="活動メニュー" items={[{ h: "/call", l: "🎶 曲募集", c: "actMenu" }, { h: "/vote", l: "📊 曲投票", c: "actMenu" }, { h: "/studio", l: "📍 スタジオ", c: "actMenu" }]} />
      <MenuSection title="アプリメニュー" items={[{ h: "/user", l: "👥 ユーザ", c: "appMenu" }, { h: "/notice", l: "📣 通知設定", c: "appMenu" }, { h: "/blue-note", l: "🎧 今日の一曲", c: "appMenu", b: "募集中" }, { h: "/board", l: "📋 掲示板", c: "appMenu" }]} />
      <MenuSection title="ホームページ連携" items={[{ h: "/live", l: "🎷 ライブ", c: "extMenu" }, { h: "/ticket", l: "🎫 予約者一覧", c: "extMenu" }, { h: "/media", l: "🎬 メディア", c: "extMenu" }]} />
      <MenuSection title="経費管理" items={[
        { h: "/travel-subsidy", l: "🚃 旅費補助額", c: "costMenu" },
        { h: "/expense-apply", l: "📝 経費申請", c: "costMenu" },
        ...(isAdmin ? [{ h: "/expense-review", l: "🔍 経費審査", c: "costMenu" }] : [])
      ]} />
    </div>
  </main>
));
MenuSectionList.displayName = "MenuSectionList";

const MediaSection = memo(({ data }: { data: Media[] }) => (
  <main className="container">
    <h3>メディア</h3>
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
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // スワイプの閾値（ピクセル）
  const minSwipeDistance = 50;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const years = [];
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) years.push(y);
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
            const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
            return (
              <div key={day} className={`${styles.calendarDay} ${isToday ? styles.today : ""}`}>
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
  const { setBreadcrumbs } = useBreadcrumb();
  const { userData } = useAuth();

  useEffect(() => {
    // ホームに来たらパンくずを空にする
    setBreadcrumbs([]);
  }, [setBreadcrumbs]);

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
          <h1><i className="fa fa-home"></i> ホーム</h1>
        </div>
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#888', marginBottom: '20px', fontStyle: 'italic' }}>
          Welcome to Streak Navi.
        </div>

        <AnnouncementSection data={initialData.announcements} />


        <CalendarSection data={initialData.calendarData} />

        <main className="container">
          <div className={styles.scoreHeader}>
            <h3>新着譜面</h3>
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
                <h3>今日の一曲</h3>
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