"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as utils from "@/src/lib/functions";
import styles from "./home.module.css"; // CSSは後ほど作成


// --- 型定義 ---
interface Announcement {
  type: "pending" | "item" | "empty";
  message?: string;
  link?: string;
  label?: string;
}

interface Score {
  id: string;
  title: string;
  title_decoded?: string;
  referenceTrack_decoded?: string;
  youtubeId_decoded?: string;
  isDispTop?: boolean;
}

interface BlueNote {
  id: string;
  title_decoded?: string;
  [key: string]: any;
}

interface Media {
  id: string;
  title: string;
  date: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  driveUrl?: string;
  isDispTop?: boolean;
}

export default function HomePage() {
  const router = useRouter();

  // --- State ---
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [quickScores, setQuickScores] = useState<Score[]>([]);
  const [allScoreWatchIds, setAllScoreWatchIds] = useState("");
  
  // 譜面プレイヤー
  const [scores, setScores] = useState<Score[]>([]);
  const [currentScoreIdx, setCurrentScoreIdx] = useState(0);

  // 今日の一曲プレイヤー
  const [blueNotes, setBlueNotes] = useState<BlueNote[]>([]);
  const [currentBNIdx, setCurrentBNIdx] = useState(0);

  // メディア
  const [medias, setMedias] = useState<Media[]>([]);

  // --- 初期化 ---
  useEffect(() => {
    const init = async () => {
      utils.showSpinner();
      try {
        await Promise.all([
          loadAnnouncements(),
          loadQuickScoresAndPlayer(),
          loadBlueNotes(),
          loadMedias(),
        ]);
      } catch (e: any) {
        console.error(e);
        await utils.writeLog({
          dataId: "none",
          action: "ホーム初期表示",
          status: "error",
          errorDetail: { message: e.message, stack: e.stack },
        });
      } finally {
        utils.hideSpinner();
      }
    };
    init();
  }, []);

  // Instagram埋め込みの再処理
  useEffect(() => {
    if ((window as any).instgrm) {
      (window as any).instgrm.Embeds.process();
    }
  }, [medias]);

  // --- 1. お知らせ (Pending Announcements) ---
  const loadAnnouncements = async () => {
    const uid = utils.getSession("uid");
    const items: Announcement[] = [];
    let hasAny = false;

    // 投票
    const votesSnap = await utils.getDocs(
      utils.query(utils.collection(utils.db, "votes"), utils.orderBy("createdAt", "desc"))
    );
    let voteHeader = false;
    for (const doc of votesSnap.docs) {
      const d = doc.data();
      if (utils.isInTerm(d.acceptStartDate, d.acceptEndDate)) {
        if (!voteHeader) {
          items.push({ type: "pending", message: "📌投票、受付中です！" });
          voteHeader = true;
          hasAny = true;
        }
        items.push({ type: "item", label: `📝${d.name}`, link: `/vote-confirm?voteId=${doc.id}` });
      }
    }

    // 曲募集
    const callsSnap = await utils.getDocs(
      utils.query(utils.collection(utils.db, "calls"), utils.orderBy("createdAt", "desc"))
    );
    let callHeader = false;
    for (const doc of callsSnap.docs) {
      const d = doc.data();
      if (utils.isInTerm(d.acceptStartDate, d.acceptEndDate)) {
        if (!callHeader) {
          items.push({ type: "pending", message: "📌候補曲、募集中です！" });
          callHeader = true;
          hasAny = true;
        }
        items.push({ type: "item", label: `🎶${d.title}`, link: `/call-confirm?callId=${doc.id}` });
      }
    }

    // 集金
    const collectsSnap = await utils.getDocs(utils.collection(utils.db, "collects"));
    let collectHeader = false;
    for (const doc of collectsSnap.docs) {
      const d = doc.data();
      if (!utils.isInTerm(d.acceptStartDate, d.acceptEndDate)) continue;
      if (!(d.participants || []).includes(uid)) continue;
      if (d.upfrontPayer === uid || d.managerName === uid) continue;

      const resSnap = await utils.getDoc(utils.doc(utils.db, "collects", doc.id, "responses", uid || ""));
      if (!resSnap.exists()) {
        if (!collectHeader) {
          items.push({ type: "pending", message: "📌集金、受付中です！" });
          collectHeader = true;
          hasAny = true;
        }
        items.push({ type: "item", label: `💰${d.title}`, link: `/collect-confirm?collectId=${doc.id}` });
      }
    }

    // イベント
    const eventsSnap = await utils.getDocs(
      utils.query(utils.collection(utils.db, "events"), utils.orderBy("date", "asc"))
    );
    const todayStr = utils.format(new Date(), "yyyy.MM.dd");
    
    const eventResults = await Promise.all(eventsSnap.docs.map(async (doc) => {
      const d = doc.data();
      const id = doc.id;
      const res = { id, title: d.title, date: d.date, isPast: d.date < todayStr, 
                    isSchedule: d.attendanceType === "schedule", isAttendance: d.attendanceType === "attendance",
                    isAssignPending: d.allowAssign, isUnanswered: false, diffDays: 0 };
      
      if (utils.isInTerm(d.acceptStartDate, d.acceptEndDate) && uid) {
        const coll = res.isSchedule ? "eventAdjustAnswers" : "eventAttendanceAnswers";
        const ans = await utils.getDoc(utils.doc(utils.db, coll, `${id}_${uid}`));
        res.isUnanswered = !ans.exists();
      }
      if (d.date) {
        const eventDate = new Date(d.date.replace(/\./g, "/"));
        const today = new Date(new Date().setHours(0,0,0,0));
        res.diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
      return res;
    }));

    const upcoming = eventResults.filter(e => !e.isPast);

    // 日程調整
    const schPending = upcoming.filter(e => e.isSchedule && e.isUnanswered);
    if (schPending.length > 0) {
      items.push({ type: "pending", message: "📌日程調整、受付中です！" });
      schPending.forEach(e => items.push({ type: "item", label: `🗓️ ${e.title}`, link: `/event-confirm?eventId=${e.id}` }));
      hasAny = true;
    }

    // 直近イベント
    let target = upcoming.find(e => e.isAttendance && e.isUnanswered) || upcoming.find(e => e.date);
    if (target) {
      let header = target.isUnanswered ? "📌出欠確認、受付中です！" : `📌次のイベントまで、あと${target.diffDays}日！`;
      if (target.diffDays === 0) header = "📌今日はイベント当日です！";
      items.push({ type: "pending", message: header });
      items.push({ type: "item", label: `📅${target.date} ${target.title}`, link: `/event-confirm?eventId=${target.id}` });
      hasAny = true;
    }

    // 譜割り
    const assPending = upcoming.filter(e => e.isAssignPending);
    if (assPending.length > 0) {
      items.push({ type: "pending", message: "📌譜割り、受付中です！" });
      assPending.forEach(e => items.push({ type: "item", label: `🎵${e.date} ${e.title}`, link: `/assign-confirm?eventId=${e.id}` }));
      hasAny = true;
    }

    if (!hasAny) items.push({ type: "empty", message: "お知らせはありません🍀" });
    setAnnouncements(items);
  };

  // --- 2. 譜面 (Quick Scores & Player) ---
  const loadQuickScoresAndPlayer = async () => {
    const snap = await utils.getDocs(
      utils.query(utils.collection(utils.db, "scores"), utils.orderBy("createdAt", "desc"))
    );
    const allScores: Score[] = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as any,
      youtubeId_decoded: utils.extractYouTubeId(doc.data().referenceTrack_decoded)
    }));

    const topScores = allScores.filter(s => s.isDispTop);
    
    // クイックリンク(最新4件)
    setQuickScores(topScores.slice(0, 4));

    // プレイリストリンク
    const ids = topScores.map(s => s.youtubeId_decoded).filter(id => !!id).join(",");
    setAllScoreWatchIds(ids);

    // プレイヤー用
    const playerScores = topScores.filter(s => !!s.youtubeId_decoded);
    setScores(playerScores);
    if (playerScores.length > 0) {
      setCurrentScoreIdx(Math.floor(Math.random() * Math.min(playerScores.length, 4)));
    }
  };

  // --- 3. 今日の一曲 ---
  const loadBlueNotes = async () => {
    const snap = await utils.getDocs(utils.collection(utils.db, "blueNotes"));
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setBlueNotes(list);

    if (list.length > 0) {
      const today = new Date();
      const todayId = String(today.getMonth() + 1).padStart(2, "0") + String(today.getDate()).padStart(2, "0");
      const idx = list.findIndex(n => n.id === todayId);
      setCurrentBNIdx(idx !== -1 ? idx : Math.floor(Math.random() * list.length));
    }
  };

  // --- 4. メディア ---
  const loadMedias = async () => {
    const snap = await utils.getDocs(
      utils.query(utils.collection(utils.db, "medias"), utils.orderBy("date", "desc"), utils.limit(10)) // limitは少し多めに取ってフィルタ
    );
    const list = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Media))
      .filter(m => m.isDispTop)
      .slice(0, 4);
    setMedias(list);
  };

  // --- プレイヤー操作 ---
  const scoreRandom = () => {
    if (scores.length <= 1) return;
    let next;
    do { next = Math.floor(Math.random() * scores.length); } while (next === currentScoreIdx);
    setCurrentScoreIdx(next);
  };

  const bnRandom = () => {
    if (blueNotes.length <= 1) return;
    setCurrentBNIdx(utils.getRandomIndex(currentBNIdx, blueNotes.length));
  };

  return (
    <div className={styles.homeContainer}>
      <div className="page-header">
        <h1><i className="fa fa-home"></i> ホーム</h1>
      </div>

      {/* お知らせ */}
      <main className="container">
        <section className={styles.announcementContainer}>
          <div className={styles.announcementHeader}><h3>お知らせ</h3></div>
          <ul className={styles.notificationList}>
            {announcements.map((a, i) => (
              <li key={i} className={a.type === "pending" ? styles.pendingMessage : a.type === "empty" ? styles.emptyMessage : ""}>
                {a.type === "item" ? (
                  <Link href={a.link || "#"} className={styles.notificationLink}>{a.label}</Link>
                ) : (
                  <div className={styles.notificationLink}>{a.message}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* 新着譜面 */}
      <main className="container">
        <div className={styles.scoreHeader}>
          <h3>新着譜面</h3>
          {allScoreWatchIds && (
            <a href={`https://www.youtube.com/watch_videos?video_ids=${allScoreWatchIds}`} 
               target="_blank" className={styles.playlistButton}>
              <i className="fa-brands fa-youtube"></i> プレイリスト
            </a>
          )}
        </div>

        <div className={styles.scoreList}>
          {quickScores.length === 0 ? (
            <div className={styles.emptyMessage}>譜面はまだ登録されていません🍀</div>
          ) : (
            <div className={styles.quickScoreGrid}>
              {quickScores.map(s => (
                <Link key={s.id} href={`/score-confirm?scoreId=${s.id}`} className={styles.quickScoreLink}>
                  🎼 {s.title}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 譜面プレイヤー */}
        {scores.length > 0 && (
          <div className={styles.playerWrapper}>
            <h2 className={styles.playerTitle}>{scores[currentScoreIdx]?.title_decoded || "参考演奏"}</h2>
            <div dangerouslySetInnerHTML={{ 
              __html: utils.buildYouTubeHtml(utils.getWatchVideosOrder(currentScoreIdx, scores), true) 
            }} />
            <div className={styles.playerControls}>
              <button onClick={() => setCurrentScoreIdx((currentScoreIdx - 1 + scores.length) % scores.length)} className={styles.playerControl}>
                <i className="fa-solid fa-backward-step"></i>
              </button>
              <button onClick={scoreRandom} className={styles.playerControl}>
                ランダム <i className="fa-solid fa-arrows-rotate"></i>
              </button>
              <button onClick={() => setCurrentScoreIdx((currentScoreIdx + 1) % scores.length)} className={styles.playerControl}>
                <i className="fa-solid fa-forward-step"></i>
              </button>
            </div>
          </div>
        )}
        <div style={{ textAlign: "center" }}>
          <Link href="/score-list" style={{ fontWeight: "bold" }}>もっと見る</Link>
        </div>
      </main>

      {/* メニュー一覧 */}
      <main className="container">
        <h3>メニュー</h3>
        <div className={styles.menuList}>
          <h2 className={styles.menuTitle}>演奏メニュー</h2>
          <Link href="/score-list" className={`${styles.menuButton} ${styles.score}`}>🎼 譜面</Link>
          <Link href="/event-list" className={`${styles.menuButton} ${styles.event}`}>🎺 イベント</Link>
          <Link href="/assign-list" className={`${styles.menuButton} ${styles.assign}`}>🎵 譜割り</Link>
          
          <h2 className={styles.menuTitle}>活動メニュー</h2>
          <Link href="/call-list" className={`${styles.menuButton} ${styles.call}`}>🎶 曲募集</Link>
          <Link href="/vote-list" className={`${styles.menuButton} ${styles.vote}`}>📊 投票</Link>
          <Link href="/collect-list" className={`${styles.menuButton} ${styles.collect}`}>💰 集金</Link>
          <Link href="/studio-list" className={`${styles.menuButton} ${styles.studio}`}>📍 スタジオ</Link>
          
          <h2 className={styles.menuTitle}>アプリメニュー</h2>
          <Link href="/user-list" className={`${styles.menuButton} ${styles.user}`}>👥 ユーザ</Link>
          <Link href="/notice-list" className={`${styles.menuButton} ${styles.notice}`}>📣 通知設定</Link>
          <Link href="/blue-note-edit" className={`${styles.menuButton} ${styles.blueNote} ${styles.badgeInline}`}>
            🎧 今日の一曲 <span className={styles.badge}>募集中</span>
          </Link>
          <Link href="/board-list" className={`${styles.menuButton} ${styles.board}`}>📋 掲示板</Link>
          
          <h2 className={styles.menuTitle}>ホームページ連携</h2>
          <Link href="/live-list" className={`${styles.menuButton} ${styles.live}`}>🎷 ライブ</Link>
          <Link href="/ticket-list" className={`${styles.menuButton} ${styles.ticket}`}>🎫 予約者一覧</Link>
          <Link href="/media-list" className={`${styles.menuButton} ${styles.media}`}>🎬 メディア</Link>
        </div>
      </main>

      {/* 今日の一曲プレイヤー */}
      {blueNotes.length > 0 && (
        <main className="container">
          <div className={styles.scoreHeader}>
            <h3>今日の一曲</h3>
            <a href={`https://www.youtube.com/watch_videos?video_ids=${utils.getWatchVideosOrder(currentBNIdx, blueNotes)?.join(",")}`} 
               target="_blank" className={styles.playlistButton}>
              <i className="fa-brands fa-youtube"></i> プレイリスト
            </a>
          </div>
          <div className={styles.playerWrapper}>
            <h2 className={styles.playerTitle}>{blueNotes[currentBNIdx]?.title_decoded}</h2>
            <div dangerouslySetInnerHTML={{ 
              __html: utils.buildYouTubeHtml(utils.getWatchVideosOrder(currentBNIdx, blueNotes), true) 
            }} />
            <div className={styles.playerControls}>
              <button onClick={() => setCurrentBNIdx((currentBNIdx - 1 + blueNotes.length) % blueNotes.length)} className={styles.playerControl}>
                <i className="fa-solid fa-backward-step"></i>
              </button>
              <button onClick={bnRandom} className={styles.playerControl}>
                ランダム <i className="fa-solid fa-arrows-rotate"></i>
              </button>
              <button onClick={() => setCurrentBNIdx((currentBNIdx + 1) % blueNotes.length)} className={styles.playerControl}>
                <i className="fa-solid fa-forward-step"></i>
              </button>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <Link href="/blue-note-edit" style={{ fontWeight: "bold" }}>もっと見る</Link>
          </div>
        </main>
      )}

      {/* メディアセクション */}
      <main className="container">
        <h3>メディア</h3>
        <div className={styles.contentList}>
          {medias.length === 0 ? (
            <div className={styles.contentItem}>メディアはまだ登録されていません🍀</div>
          ) : (
            medias.map(m => (
              <div key={m.id} className={styles.contentItem}>
                <h4>{m.title}</h4>
                <div className={styles.mediaDate}>{m.date}</div>
                {m.instagramUrl && <div dangerouslySetInnerHTML={{ __html: utils.buildInstagramHtml(m.instagramUrl) }} />}
                {m.youtubeUrl && <div dangerouslySetInnerHTML={{ __html: utils.buildYouTubeHtml(m.youtubeUrl, true) }} />}
                {m.driveUrl && <div dangerouslySetInnerHTML={{ __html: utils.buildGoogleDriveHtml(m.driveUrl, true) }} />}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}