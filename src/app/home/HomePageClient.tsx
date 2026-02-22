"use client";

import React, { useState, useEffect, useMemo, memo } from "react"; // memoを追加
import Link from "next/link";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import * as utils from "@/src/lib/functions";
import styles from "./home.module.css";

// --- 再描画させないためのメモ化コンポーネント群 ---

const AnnouncementSection = memo(({ data }: { data: any[] }) => (
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

const MenuSectionList = memo(() => (
  <main className="container">
    <h3>メニュー</h3>
    <div className={styles.menuList}>
      <MenuSection title="演奏メニュー" items={[{h: "/score", l: "🎼 譜面", c: "score"}, {h: "/event", l: "🎺 イベント", c: "event"}, {h: "/assign", l: "🎵 譜割り", c: "assign"}]} />
      <MenuSection title="活動メニュー" items={[{h: "/call", l: "🎶 曲募集", c: "call"}, {h: "/vote", l: "📊 投票", c: "vote"}, {h: "/collect", l: "💰 集金", c: "collect"}, {h: "/studio", l: "📍 スタジオ", c: "studio"}]} />
      <MenuSection title="アプリメニュー" items={[{h: "/user", l: "👥 ユーザ", c: "user"}, {h: "/notice", l: "📣 通知設定", c: "notice"}, {h: "/blue-note", l: "🎧 今日の一曲", c: "blueNote", b: "募集中"}, {h: "/board", l: "📋 掲示板", c: "board"}]} />
      <MenuSection title="ホームページ連携" items={[{h: "/live", l: "🎷 ライブ", c: "live"}, {h: "/ticket", l: "🎫 予約者一覧", c: "ticket"}, {h: "/media", l: "🎬 メディア", c: "media"}]} />
    </div>
  </main>
));
MenuSectionList.displayName = "MenuSectionList";

const MediaSection = memo(({ data }: { data: any[] }) => (
  <main className="container">
    <h3>メディア</h3>
    <div className={styles.contentList}>
      {data.length ? data.map(m => (
        <div key={m.id} className={styles.contentItem}>
          <h4>{m.title}</h4>
          <div className={styles.mediaDate}>{m.date}</div>
          {m.instagramUrl && <div dangerouslySetInnerHTML={{ __html: utils.buildInstagramHtml(m.instagramUrl) }} />}
          {m.youtubeUrl && <div dangerouslySetInnerHTML={{ __html: utils.buildYouTubeHtml(m.youtubeUrl, true, true) }} />}
          {m.driveUrl && <div dangerouslySetInnerHTML={{ __html: utils.buildGoogleDriveHtml(m.driveUrl, true) }} />}
        </div>
      )) : <div className={styles.contentItem}>メディアはまだ登録されていません🍀</div>}
    </div>
  </main>
));
MediaSection.displayName = "MediaSection";

// --- メインコンポーネント ---

export default function HomePageClient({ initialData }: any) {
  const [currentScoreIdx, setCurrentScoreIdx] = useState(0);
  const [currentBNIdx, setCurrentBNIdx] = useState(0);
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    // ホームに来たらパンくずを空にする
    setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (initialData.scores.length) {
      setCurrentScoreIdx(Math.floor(Math.random() * Math.min(initialData.scores.length, 4)));
    }
    if (initialData.blueNotes.length) {
      const todayId = utils.format(new Date(), "MMdd");
      const idx = initialData.blueNotes.findIndex((n: any) => n.id === todayId);
      setCurrentBNIdx(idx !== -1 ? idx : Math.floor(Math.random() * initialData.blueNotes.length));
    }
  }, [initialData]);

  useEffect(() => {
    if ((window as any).instgrm) (window as any).instgrm.Embeds.process();
  }, [initialData.medias]);

  const scorePlaylistIds = useMemo(() => initialData.scores.map((s: any) => s.youtubeId).filter(Boolean).join(","), [initialData.scores]);
  const bnPlaylistIds = useMemo(() => utils.getWatchVideosOrder(currentBNIdx, initialData.blueNotes)?.join(","), [currentBNIdx, initialData.blueNotes]);

  return (
    <div className={styles.homeContainer}>
      <div className="page-header"><h1><i className="fa fa-home"></i> ホーム</h1></div>
      
      {/* メモ化したのでStateが変わっても再描画されない */}
      <AnnouncementSection data={initialData.announcements} />

      <main className="container">
        <div className={styles.scoreHeader}>
          <h3>新着譜面</h3>
          {scorePlaylistIds && <a href={`https://www.youtube.com/watch_videos?video_ids=${scorePlaylistIds}`} target="_blank" className={styles.playlistButton} rel="noreferrer"><i className="fa-brands fa-youtube"></i> プレイリスト</a>}
        </div>
        <div className={styles.scoreList}>
          {initialData.quickScores.length ? (
            <div className={styles.quickScoreGrid}>
              {initialData.quickScores.map((s: any) => <Link prefetch={true} key={s.id} href={`/score/confirm?scoreId=${s.id}`} className={styles.quickScoreLink}>🎼 {s.title}</Link>)}
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

      <MenuSectionList />

      <main className="container">
        {initialData.blueNotes.length > 0 && (
          <>
            <div className={styles.scoreHeader}>
              <h3>今日の一曲</h3>
              <a href={`https://www.youtube.com/watch_videos?video_ids=${bnPlaylistIds}`} target="_blank" className={styles.playlistButton} rel="noreferrer"><i className="fa-brands fa-youtube"></i> プレイリスト</a>
            </div>
            <Player 
              title={initialData.blueNotes[currentBNIdx]?.title} 
              data={initialData.blueNotes} 
              idx={currentBNIdx} 
              setIdx={setCurrentBNIdx} 
              onRandom={() => setCurrentBNIdx(utils.getRandomIndex(currentBNIdx, initialData.blueNotes.length))}
            />
            <div style={{ textAlign: "center", marginTop: "10px" }}><Link prefetch={true} href="/blue-note" style={{ fontWeight: "bold" }}>もっと見る</Link></div>
          </>
        )}
      </main>

      {/* ここもメモ化 */}
      <MediaSection data={initialData.medias} />
    </div>
  );
}

// Playerコンポーネントも memo化して、自分の管理するState以外では動かないようにする
const Player = memo(({ title, data, idx, setIdx, onRandom }: any) => (
  <div>
    <h2 className={styles.playerTitle}>{title}</h2>
    <div dangerouslySetInnerHTML={{ __html: utils.buildYouTubeHtml(utils.getWatchVideosOrder(idx, data), false) }} />
    <div className={styles.playerControls}>
      <button onClick={() => setIdx((idx - 1 + data.length) % data.length)} className={styles.playerControl}><i className="fa-solid fa-backward-step"></i></button>
      <button onClick={onRandom} className={styles.playerControl}>ランダム <i className="fa-solid fa-arrows-rotate"></i></button>
      <button onClick={() => setIdx((idx + 1) % data.length)} className={styles.playerControl}><i className="fa-solid fa-forward-step"></i></button>
    </div>
  </div>
));
Player.displayName = "Player";

const MenuSection = ({ title, items }: any) => (
  <>
    <h2 className={styles.menuTitle}>{title}</h2>
    {items.map((item: any) => (
      <Link prefetch={true} key={item.h} href={item.h} className={`${styles.menuButton} ${styles[item.c]} ${item.b ? styles.badgeInline : ""}`}>
        {item.l} {item.b && <span className={styles.badge}>{item.b}</span>}
      </Link>
    ))}
  </>
);