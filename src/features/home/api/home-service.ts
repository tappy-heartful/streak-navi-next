import { adminDb } from "@/src/lib/firebase-admin";
import * as utils from "@/src/lib/functions";
import { Announcement, BlueNote, Media, Score } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * ホーム画面用のお知らせ一覧を取得（サーバーサイド専用）
 */
export async function getAnnouncementsServer() {
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

  // 投票・候補曲
  checkTerm(votes, "📌投票、受付中です！", "name", "/vote/confirm?voteId=");
  checkTerm(calls, "📌候補曲、募集中です！", "title", "/call/confirm?callId=");

  // 集金
  let collectHeader = false;
  collects.forEach(cDoc => {
    const d = cDoc.data();
    if (utils.isInTerm(d.acceptStartDate, d.acceptEndDate)) {
      if (!collectHeader) { items.push({ type: "pending", message: "📌集金、受付中です！" }); collectHeader = true; }
      items.push({ type: "item", label: `💰${d.title}`, link: `/collect/confirm?collectId=${cDoc.id}` });
    }
  });

  // イベント関連のロジック
  const eventResults = events.docs.map(eDoc => {
    const d = eDoc.data();
    if (d.date < todayStr) return null;
    const diffDays = d.date ? Math.ceil((new Date(d.date.replace(/\./g, "/")).getTime() - new Date().setHours(0,0,0,0)) / 86400000) : 0;
    return { id: eDoc.id, title: d.title, date: d.date, attendanceType: d.attendanceType, allowAssign: d.allowAssign, isUnanswered: false, diffDays };
  });

  const upcoming = eventResults.filter((e): e is any => e !== null);
  
  // 日程調整
  const schPending = upcoming.filter(e => e.attendanceType === "schedule");
  if (schPending.length) {
    items.push({ type: "pending", message: "📌日程調整、受付中です！" });
    schPending.forEach(e => items.push({ type: "item", label: `🗓️ ${e.title}`, link: `/event/confirm?eventId=${e.id}` }));
  }

  // 次のイベント
  const target = upcoming[0];
  if (target) {
    const header = target.diffDays === 0 ? "📌今日はイベント当日です！" : `📌次のイベントまで、あと${target.diffDays}日！`;
    items.push({ type: "pending", message: header }, { type: "item", label: `📅${target.date} ${target.title}`, link: `/event/confirm?eventId=${target.id}` });
  }

  // 譜割り
  const assignPending = upcoming.filter(e => e.allowAssign);
  if (assignPending.length) {
    items.push({ type: "pending", message: "📌譜割り、受付中です！" });
    assignPending.forEach(e => items.push({ type: "item", label: `🎵${e.date} ${e.title}`, link: `/assign/confirm?eventId=${e.id}` }));
  }

  return (items.length ? items : [{ type: "empty", message: "お知らせはありません🍀" }]) as Announcement[];
}


/**
 * 全譜面データを取得
 */
export async function getScoresServer() {
  const snap = await adminDb.collection("scores").orderBy("createdAt", "desc").get();
  return snap.docs.map(doc => {
    const data = toPlainObject(doc);
    return {
      ...data,
      youtubeId: utils.extractYouTubeId(data.referenceTrack)
    };
  }) as unknown as Score[];
}

export async function getBlueNotesServer() {
  const snap = await adminDb.collection("blueNotes").get();
  return snap.docs.map(toPlainObject) as unknown as BlueNote[];
}

export async function getMediasServer(count = 10) {
  const snap = await adminDb.collection("medias").orderBy("date", "desc").limit(count).get();
  return snap.docs.map(toPlainObject) as unknown as Media[];
}
