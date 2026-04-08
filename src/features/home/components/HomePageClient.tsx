"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import Link from "next/link";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useAuth } from "@/src/contexts/AuthContext";
import * as utils from "@/src/lib/functions";
import styles from "./home.module.css";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { Announcement, Score, BlueNote, Media } from "@/src/lib/firestore/types";
import { InstagramEmbed } from "@/src/components/InstagramEmbed";

// --- 再描画させないためのメモ化コンポーネント群 ---

const AnnouncementSection = memo(({ data }: { data: Announcement[] }) => (
  <main className="container">
    <section className={styles.announcementContainer}>
      <div className={styles.announcementHeader}><h3>お知らせ</h3></div>
      <ul className={styles.notificationList}>
        {data.map((a, i) => (
          <li key={i} className={styles[a.type === "pending" ? "pendingMessage" : a.type === "empty" ? "emptyMessage" : ""]}>
            {a.type === "item" ? <Link prefetch={true} href={a.link || "#"} className={styles.notificationLink}>{a.label}</Link> : <div className={styles.notificationLink}>{a.message}</div>}
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
      <MenuSection title="活動メニュー" items={[{ h: "/call", l: "🎶 曲募集", c: "actMenu" }, { h: "/vote", l: "📊 投票", c: "actMenu" }, { h: "/studio", l: "📍 スタジオ", c: "actMenu" }]} />
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

// --- メインコンポーネント ---

type InitialData = {
  announcements: Announcement[];
  quickScores: Score[];
  scores: Score[];
  blueNotes: BlueNote[];
  medias: Media[];
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
      setCurrentScoreIdx(Math.floor(Math.random() * Math.min(initialData.scores.length, 4)));
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

        <main className="container">
          <button
            onClick={() => window.dispatchEvent(new Event("openChat"))}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              background: "linear-gradient(135deg, #4CAF50 0%, #66bb6a 100%)",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              textAlign: "left",
              boxShadow: "0 2px 8px rgba(76,175,80,0.3)",
            }}
          >
            <i className="fa-solid fa-robot" style={{ fontSize: "1.4rem", color: "#fff", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: "bold", fontSize: "0.9rem", color: "#fff" }}>AIコンシェルジュに聞く</div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", marginTop: "2px" }}>イベント・投票・曲募集など何でも</div>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ marginLeft: "auto", color: "rgba(255,255,255,0.8)", fontSize: "0.85rem" }} />
          </button>
        </main>

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