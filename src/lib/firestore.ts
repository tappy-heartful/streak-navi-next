import { adminDb } from "./firebase-admin";
import * as utils from "./functions";

// --- 型定義 ---
export interface Announcement { type: "pending" | "item" | "empty"; message?: string; link?: string; label?: string; }
export interface Score { id: string; title: string; referenceTrack?: string; youtubeId?: string; isDispTop?: boolean; createdAt?: number; }
export interface BlueNote { id: string; title?: string; [key: string]: any; }
export interface Media { id: string; title: string; date: string; instagramUrl?: string; youtubeUrl?: string; driveUrl?: string; isDispTop?: boolean; }

/**
 * お知らせ取得（サーバーサイド専用）
 */
export async function getAnnouncementsServer(uid: string | null) {
  const items: Announcement[] = [];
  const todayStr = utils.format(new Date(), "yyyy.MM.dd");

  const [votes, calls, collects, events] = await Promise.all([
    adminDb.collection("votes").orderBy("createdAt", "desc").get(),
    adminDb.collection("calls").orderBy("createdAt", "desc").get(),
    adminDb.collection("collects").get(),
    adminDb.collection("events").orderBy("date", "asc").get()
  ]);

  const checkTerm = (snap: FirebaseFirestore.QuerySnapshot, msg: string, labelKey: string, linkBase: string) => {
    let headerAdded = false;
    snap.forEach((doc) => {
      const d = doc.data();
      if (utils.isInTerm(d.acceptStartDate, d.acceptEndDate)) {
        if (!headerAdded) { items.push({ type: "pending", message: msg }); headerAdded = true; }
        items.push({ type: "item", label: d[labelKey], link: `${linkBase}${doc.id}` });
      }
    });
  };

  checkTerm(votes, "📌投票、受付中です！", "name", "/vote-confirm?voteId=");
  checkTerm(calls, "📌候補曲、募集中です！", "title", "/call-confirm?callId=");

  if (uid) {
    let collectHeader = false;
    for (const cDoc of collects.docs) {
      const d = cDoc.data();
      if (utils.isInTerm(d.acceptStartDate, d.acceptEndDate) && (d.participants || []).includes(uid) && d.upfrontPayer !== uid && d.managerName !== uid) {
        const res = await adminDb.collection("collects").doc(cDoc.id).collection("responses").doc(uid).get();
        if (!res.exists) {
          if (!collectHeader) { items.push({ type: "pending", message: "📌集金、受付中です！" }); collectHeader = true; }
          items.push({ type: "item", label: `💰${d.title}`, link: `/collect-confirm?collectId=${cDoc.id}` });
        }
      }
    }
  }

  const eventResults = await Promise.all(events.docs.map(async (eDoc) => {
    const d = eDoc.data();
    if (d.date < todayStr) return null;
    let isUnanswered = false;
    if (utils.isInTerm(d.acceptStartDate, d.acceptEndDate) && uid) {
      const coll = d.attendanceType === "schedule" ? "eventAdjustAnswers" : "eventAttendanceAnswers";
      const ans = await adminDb.collection(coll).doc(`${eDoc.id}_${uid}`).get();
      isUnanswered = !ans.exists;
    }
    const diffDays = d.date ? Math.ceil((new Date(d.date.replace(/\./g, "/")).getTime() - new Date().setHours(0,0,0,0)) / 86400000) : 0;
    return { id: eDoc.id, title: d.title, date: d.date, attendanceType: d.attendanceType, allowAssign: d.allowAssign, isUnanswered, diffDays };
  }));

  const upcoming = eventResults.filter((e): e is any => e !== null);
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

  return (items.length ? items : [{ type: "empty", message: "お知らせはありません🍀" }]) as Announcement[];
}

/**
 * 譜面取得（修正済み）
 */
export async function getScoresServer() {
  const snap = await adminDb.collection("scores").orderBy("createdAt", "desc").get();
  return snap.docs.map(doc => {
    const data = doc.data() as any;
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toMillis?.() || null,
      updatedAt: data.updatedAt?.toMillis?.() || null,
      youtubeId: utils.extractYouTubeId(data.referenceTrack)
    };
  }) as unknown as Score[];
}

/**
 * 今日の一曲（修正済み：ここがエラーの原因でした）
 */
export async function getBlueNotesServer() {
  const snap = await adminDb.collection("blueNotes").get();
  return snap.docs.map(doc => {
    const data = doc.data() as any;
    return {
      ...data,
      id: doc.id,
      // 念のため、BlueNote 内の Timestamp もすべて変換
      createdAt: data.createdAt?.toMillis?.() || null,
      updatedAt: data.updatedAt?.toMillis?.() || null,
    };
  }) as unknown as BlueNote[];
}

/**
 * メディア（修正済み）
 */
export async function getMediasServer(count = 10) {
  const snap = await adminDb.collection("medias").orderBy("date", "desc").limit(count).get();
  return snap.docs.map(doc => {
    const data = doc.data() as any;
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toMillis?.() || null,
      updatedAt: data.updatedAt?.toMillis?.() || null,
    };
  }) as unknown as Media[];
}