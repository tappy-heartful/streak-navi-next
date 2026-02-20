"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as utils from "@/src/lib/functions";
import styles from "./home.module.css";

// --- 型定義 ---
interface Announcement { type: "pending" | "item" | "empty"; message?: string; link?: string; label?: string; }
interface Score { id: string; title: string; referenceTrack?: string; youtubeId?: string; isDispTop?: boolean; }
interface BlueNote { id: string; title?: string; [key: string]: any; }
interface Media { id: string; title: string; date: string; instagramUrl?: string; youtubeUrl?: string; driveUrl?: string; isDispTop?: boolean; }
// 追加: イベント用の型定義
interface EventItem {
  id: string;
  title: string;
  date: string;
  attendanceType: string;
  allowAssign?: boolean;
  isUnanswered: boolean;
  diffDays: number;
}

export default function HomePage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [quickScores, setQuickScores] = useState<Score[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [currentScoreIdx, setCurrentScoreIdx] = useState(0);
  const [blueNotes, setBlueNotes] = useState<BlueNote[]>([]);
  const [currentBNIdx, setCurrentBNIdx] = useState(0);
  const [medias, setMedias] = useState<Media[]>([]);

  const uid = utils.getSession("uid");

  useEffect(() => {
    const init = async () => {
      utils.showSpinner();
      try {
        await Promise.all([loadAnnouncements(), loadScores(), loadBlueNotes(), loadMedias()]);
      } catch (e: any) {
        console.error(e);
        utils.writeLog({ dataId: "none", action: "ホーム初期表示", status: "error", errorDetail: { message: e.message, stack: e.stack } });
      } finally {
        utils.hideSpinner();
      }
    };
    init();
  }, []);

  useEffect(() => {
    if ((window as any).instgrm) (window as any).instgrm.Embeds.process();
  }, [medias]);

  // --- 1. お知らせ取得 ---
  const loadAnnouncements = async () => {
    const items: Announcement[] = [];
    const todayStr = utils.format(new Date(), "yyyy.MM.dd");

    const [votes, calls, collects, events] = await Promise.all([
      utils.getDocs(utils.query(utils.collection(utils.db, "votes"), utils.orderBy("createdAt", "desc"))),
      utils.getDocs(utils.query(utils.collection(utils.db, "calls"), utils.orderBy("createdAt", "desc"))),
      utils.getDocs(utils.collection(utils.db, "collects")),
      utils.getDocs(utils.query(utils.collection(utils.db, "events"), utils.orderBy("date", "asc")))
    ]);

    // 共通セクション追加ロジック
    const addSection = (msg: string, docs: any[], labelKey: string, linkBase: string) => {
      let headerAdded = false;
      docs.forEach((doc) => {
        const d = doc.data();
        if (utils.isInTerm(d.acceptStartDate, d.acceptEndDate)) {
          if (!headerAdded) { items.push({ type: "pending", message: msg }); headerAdded = true; }
          items.push({ type: "item", label: d[labelKey], link: `${linkBase}${doc.id}` });
        }
      });
    };

    addSection("📌投票、受付中です！", votes.docs, "name", "/vote-confirm?voteId=");
    addSection("📌候補曲、募集中です！", calls.docs, "title", "/call-confirm?callId=");

    let collectHeader = false;
    for (const doc of collects.docs) {
      const d = doc.data();
      if (utils.isInTerm(d.acceptStartDate, d.acceptEndDate) && (d.participants || []).includes(uid) && d.upfrontPayer !== uid && d.managerName !== uid) {
        const res = await utils.getDoc(utils.doc(utils.db, "collects", doc.id, "responses", uid || ""));
        if (!res.exists()) {
          if (!collectHeader) { items.push({ type: "pending", message: "📌集金、受付中です！" }); collectHeader = true; }
          items.push({ type: "item", label: `💰${d.title}`, link: `/collect-confirm?collectId=${doc.id}` });
        }
      }
    }

// --- イベント処理 (ここを修正) ---
    const eventResults = await Promise.all(events.docs.map(async (doc): Promise<EventItem | null> => {
      const d = doc.data() as any; // 一旦 any で受け取る
      if (d.date < todayStr) return null;

      let isUnanswered = false;
      if (utils.isInTerm(d.acceptStartDate, d.acceptEndDate) && uid) {
        const coll = d.attendanceType === "schedule" ? "eventAdjustAnswers" : "eventAttendanceAnswers";
        const ans = await utils.getDoc(utils.doc(utils.db, coll, `${doc.id}_${uid}`));
        isUnanswered = !ans.exists();
      }
      const diffDays = d.date ? Math.ceil((new Date(d.date.replace(/\./g, "/")).getTime() - new Date().setHours(0,0,0,0)) / 86400000) : 0;
      
      return { 
        id: doc.id, 
        title: d.title || "", 
        date: d.date || "", 
        attendanceType: d.attendanceType || "", 
        allowAssign: d.allowAssign || false,
        isUnanswered, 
        diffDays 
      };
    }));

    // TypeScriptにnullでないことを保証させる(型ガード)
    const upcoming = eventResults.filter((e): e is NonNullable<typeof e> => e !== null);

    const schPending = upcoming.filter(e => e.attendanceType === "schedule" && e.isUnanswered);
    if (schPending.length) {
      items.push({ type: "pending", message: "📌日程調整、受付中です！" });
      schPending.forEach(e => items.push({ type: "item", label: `🗓️ ${e.title}`, link: `/event-confirm?eventId=${e.id}` }));
    }

    const target = upcoming.find(e => e.attendanceType === "attendance" && e.isUnanswered) || upcoming.find(e => e.date);
    if (target) {
      const header = target.isUnanswered ? "📌出欠確認、受付中です！" : target.diffDays === 0 ? "📌今日はイベント当日です！" : `📌次のイベントまで、あと${target.diffDays}日！`;
      items.push({ type: "pending", message: header }, { type: "item", label: `📅${target.date} ${target.title}`, link: `/event-confirm?eventId=${target.id}` });
    }

    const assignPending = upcoming.filter(e => e.allowAssign);
    if (assignPending.length) {
      items.push({ type: "pending", message: "📌譜割り、受付中です！" });
      assignPending.forEach(e => items.push({ type: "item", label: `🎵${e.date} ${e.title}`, link: `/assign-confirm?eventId=${e.id}` }));
    }

    setAnnouncements(items.length ? items : [{ type: "empty", message: "お知らせはありません🍀" }]);
  };

  // --- 譜面 / 今日の一曲 / メディア (最適化済み) ---
  const loadScores = async () => {
    const snap = await utils.getDocs(utils.query(utils.collection(utils.db, "scores"), utils.orderBy("createdAt", "desc")));
    const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any, youtubeId: utils.extractYouTubeId(doc.data().referenceTrack) }));
    const top = all.filter(s => s.isDispTop);
    setQuickScores(top.slice(0, 4));
    const players = top.filter(s => !!s.youtubeId);
    setScores(players);
    if (players.length) setCurrentScoreIdx(Math.floor(Math.random() * Math.min(players.length, 4)));
  };

  const loadBlueNotes = async () => {
    const snap = await utils.getDocs(utils.collection(utils.db, "blueNotes"));
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setBlueNotes(list);
    if (list.length) {
      const todayId = utils.format(new Date(), "MMdd");
      const idx = list.findIndex(n => n.id === todayId);
      setCurrentBNIdx(idx !== -1 ? idx : Math.floor(Math.random() * list.length));
    }
  };

  const loadMedias = async () => {
    const snap = await utils.getDocs(utils.query(utils.collection(utils.db, "medias"), utils.orderBy("date", "desc"), utils.limit(10)));
    setMedias(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Media)).filter(m => m.isDispTop).slice(0, 4));
  };

  const scorePlaylistIds = useMemo(() => scores.map(s => s.youtubeId).filter(Boolean).join(","), [scores]);
  const bnPlaylistIds = useMemo(() => utils.getWatchVideosOrder(currentBNIdx, blueNotes)?.join(","), [currentBNIdx, blueNotes]);

  return (
    <div className={styles.homeContainer}>
      <div className="page-header"><h1><i className="fa fa-home"></i> ホーム</h1></div>
      <main className="container">
        <section className={styles.announcementContainer}>
          <div className={styles.announcementHeader}><h3>お知らせ</h3></div>
          <ul className={styles.notificationList}>
            {announcements.map((a, i) => (
              <li key={i} className={styles[a.type === "pending" ? "pendingMessage" : a.type === "empty" ? "emptyMessage" : ""]}>
                {a.type === "item" ? <Link href={a.link || "#"} className={styles.notificationLink}>{a.label}</Link> : <div className={styles.notificationLink}>{a.message}</div>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <main className="container">
          <div className={styles.scoreHeader}>
            <h3>新着譜面</h3>
            {scorePlaylistIds && <a href={`https://www.youtube.com/watch_videos?video_ids=${scorePlaylistIds}`} target="_blank" className={styles.playlistButton}><i className="fa-brands fa-youtube"></i> プレイリスト</a>}
          </div>
          <div className={styles.scoreList}>
            {quickScores.length ? (
              <div className={styles.quickScoreGrid}>
                {quickScores.map(s => <Link key={s.id} href={`/score-confirm?scoreId=${s.id}`} className={styles.quickScoreLink}>🎼 {s.title}</Link>)}
              </div>
            ) : <div className={styles.emptyMessage}>譜面はまだ登録されていません🍀</div>}
          </div>
          {scores.length > 0 && (
            <Player 
              title={scores[currentScoreIdx]?.title || "参考演奏"} 
              data={scores} 
              idx={currentScoreIdx} 
              setIdx={setCurrentScoreIdx} 
              onRandom={() => setCurrentScoreIdx(utils.getRandomIndex(currentScoreIdx, scores.length))}
            />
          )}
          <div style={{ textAlign: "center", marginTop: "10px" }}><Link href="/score" style={{ fontWeight: "bold" }}>もっと見る</Link></div>
        
      </main>

      <main className="container">
          <h3>メニュー</h3>
          <div className={styles.menuList}>
            <MenuSection title="演奏メニュー" items={[{h: "/score", l: "🎼 譜面", c: "score"}, {h: "/event", l: "🎺 イベント", c: "event"}, {h: "/assign", l: "🎵 譜割り", c: "assign"}]} />
            <MenuSection title="活動メニュー" items={[{h: "/call", l: "🎶 曲募集", c: "call"}, {h: "/vote", l: "📊 投票", c: "vote"}, {h: "/collect", l: "💰 集金", c: "collect"}, {h: "/studio", l: "📍 スタジオ", c: "studio"}]} />
            <MenuSection title="アプリメニュー" items={[{h: "/user", l: "👥 ユーザ", c: "user"}, {h: "/notice", l: "📣 通知設定", c: "notice"}, {h: "/blue-note", l: "🎧 今日の一曲", c: "blueNote", b: "募集中"}, {h: "/board", l: "📋 掲示板", c: "board"}]} />
            <MenuSection title="ホームページ連携" items={[{h: "/live", l: "🎷 ライブ", c: "live"}, {h: "/ticket", l: "🎫 予約者一覧", c: "ticket"}, {h: "/media", l: "🎬 メディア", c: "media"}]} />
          </div>
      </main>

      <main className="container">
        {blueNotes.length > 0 && (
          <>
            <div className={styles.scoreHeader}>
              <h3>今日の一曲</h3>
              <a href={`https://www.youtube.com/watch_videos?video_ids=${bnPlaylistIds}`} target="_blank" className={styles.playlistButton}><i className="fa-brands fa-youtube"></i> プレイリスト</a>
            </div>
            <Player 
              title={blueNotes[currentBNIdx]?.title} 
              data={blueNotes} 
              idx={currentBNIdx} 
              setIdx={setCurrentBNIdx} 
              onRandom={() => setCurrentBNIdx(utils.getRandomIndex(currentBNIdx, blueNotes.length))}
            />
            <div style={{ textAlign: "center", marginTop: "10px" }}><Link href="/blue-note" style={{ fontWeight: "bold" }}>もっと見る</Link></div>
          </>
        )}
      </main>

      <main className="container">
          <h3>メディア</h3>
          <div className={styles.contentList}>
            {medias.length ? medias.map(m => (
              <div key={m.id} className={styles.contentItem}>
                <h4>{m.title}</h4>
                <div className={styles.mediaDate}>{m.date}</div>
                {m.instagramUrl && <div dangerouslySetInnerHTML={{ __html: utils.buildInstagramHtml(m.instagramUrl) }} />}
                {m.youtubeUrl && <div dangerouslySetInnerHTML={{ __html: utils.buildYouTubeHtml(m.youtubeUrl, true) }} />}
                {m.driveUrl && <div dangerouslySetInnerHTML={{ __html: utils.buildGoogleDriveHtml(m.driveUrl, true) }} />}
              </div>
            )) : <div className={styles.contentItem}>メディアはまだ登録されていません🍀</div>}
          </div>
        
      </main>
    </div>
  );
}

// 内部コンポーネント
const Player = ({ title, data, idx, setIdx, onRandom }: any) => (
  <div className={styles.playerWrapper}>
    <h2 className={styles.playerTitle}>{title}</h2>
    <div dangerouslySetInnerHTML={{ __html: utils.buildYouTubeHtml(utils.getWatchVideosOrder(idx, data)) }} />
    <div className={styles.playerControls}>
      <button onClick={() => setIdx((idx - 1 + data.length) % data.length)} className={styles.playerControl}><i className="fa-solid fa-backward-step"></i></button>
      <button onClick={onRandom} className={styles.playerControl}>ランダム <i className="fa-solid fa-arrows-rotate"></i></button>
      <button onClick={() => setIdx((idx + 1) % data.length)} className={styles.playerControl}><i className="fa-solid fa-forward-step"></i></button>
    </div>
  </div>
);

const MenuSection = ({ title, items }: any) => (
  <>
    <h2 className={styles.menuTitle}>{title}</h2>
    {items.map((item: any) => (
      <Link key={item.h} href={item.h} className={`${styles.menuButton} ${styles[item.c]} ${item.b ? styles.badgeInline : ""}`}>
        {item.l} {item.b && <span className={styles.badge}>{item.b}</span>}
      </Link>
    ))}
  </>
);