import { adminDb } from "@/src/lib/firebase-admin";
import * as utils from "@/src/lib/functions";
import { Announcement, BlueNote, Media, Score, Issue } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { unstable_cache } from "next/cache";

function buildAnnouncementsFromSnaps(
  eventsSnap: FirebaseFirestore.QuerySnapshot,
  votesSnap: FirebaseFirestore.QuerySnapshot,
  callsSnap: FirebaseFirestore.QuerySnapshot
): Announcement[] {
  const items: Announcement[] = [];
  const todayStr = utils.format(new Date(), "yyyy.MM.dd");

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

  // 曲投票・候補曲
  checkTerm(votesSnap, "曲投票、受付中です！", "name", "/vote/confirm?voteId=");
  checkTerm(callsSnap, "候補曲、募集中です！", "title", "/call/confirm?callId=");

  // イベント関連のロジック
  const eventList = eventsSnap.docs.map(eDoc => {
    const d = eDoc.data();
    const isInAcceptTerm = utils.isInTerm(d.acceptStartDate, d.acceptEndDate);

    const todayJstStr = utils.format(new Date(), "yyyy-MM-dd");
    const todayMidnight = new Date(`${todayJstStr}T00:00:00+09:00`).getTime();
    const eventJstStr = d.date ? d.date.replace(/\./g, "-") : "";
    const eventMidnight = eventJstStr ? new Date(`${eventJstStr}T00:00:00+09:00`).getTime() : 0;
    const diffDays = eventMidnight ? Math.round((eventMidnight - todayMidnight) / 86400000) : 0;

    return {
      id: eDoc.id,
      title: d.title || "",
      date: d.date || "",
      attendanceType: d.attendanceType || "attendance",
      allowAssign: !!d.allowAssign,
      diffDays,
      isInAcceptTerm
    };
  });

  // 1. 日程調整
  const activeSchedules = eventList.filter(e => e.attendanceType === "schedule" && e.isInAcceptTerm);
  if (activeSchedules.length) {
    items.push({ type: "pending", message: "日程調整、受付中です！" });
    activeSchedules.forEach(e => items.push({ type: "item", label: `🗓️ ${e.title}`, link: `/event/confirm?eventId=${e.id}` }));
  }

  // 2. 直近のイベント
  const upcomingAttendance = eventList
    .filter(e => e.attendanceType === "attendance" && e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  const target = upcomingAttendance[0];
  if (target) {
    const isAccepting = target.isInAcceptTerm;
    const header = isAccepting 
      ? `イベントまであと${target.diffDays}日です！\n出欠確認、受付中です！`
      : (target.diffDays === 0 ? "今日はイベント当日です！" : `次のイベントまで、あと${target.diffDays}日！`);
    items.push({ type: "pending", message: header }, { type: "item", label: `📅${target.date} ${target.title}`, link: `/event/confirm?eventId=${target.id}` });
  }

  // 3. 譜割り
  const assignPending = upcomingAttendance.filter(e => e.allowAssign);
  if (assignPending.length) {
    items.push({ type: "pending", message: "譜割り、受付中です！" });
    assignPending.forEach(e => items.push({ type: "item", label: `🎵${e.date} ${e.title}`, link: `/assign/confirm?eventId=${e.id}` }));
  }

  return (items.length ? items : [{ type: "empty", message: "お知らせはありません🍀" }]) as Announcement[];
}

/**
 * ホーム画面用の統合フィードデータ（重複クエリを排除し、一括取得）
 */
export async function getHomeFeedDataServer() {
  const [eventsSnap, votesSnap, callsSnap, issuesSnap] = await Promise.all([
    adminDb.collection("events").get(),
    adminDb.collection("votes").orderBy("createdAt", "desc").get(),
    adminDb.collection("calls").orderBy("createdAt", "desc").get(),
    adminDb.collection("issues").get(),
  ]);

  const announcements = buildAnnouncementsFromSnaps(eventsSnap, votesSnap, callsSnap);

  const events = eventsSnap.docs.map(toPlainObject);
  const votes = votesSnap.docs.map(toPlainObject);
  const calls = callsSnap.docs.map(toPlainObject);
  const issues = issuesSnap.docs.map(toPlainObject);

  const calendarData = { events, votes, calls, issues };

  return { announcements, calendarData };
}

/**
 * ホーム画面用のお知らせ一覧を取得（サーバーサイド専用）
 */
export async function getAnnouncementsServer() {
  const [votes, calls, events] = await Promise.all([
    adminDb.collection("votes").orderBy("createdAt", "desc").get(),
    adminDb.collection("calls").orderBy("createdAt", "desc").get(),
    adminDb.collection("events").get()
  ]);
  return buildAnnouncementsFromSnaps(events, votes, calls);
}

/**
 * ホーム表示用の譜面データを取得（全件取得ではなくisDispTop=trueのみに絞り込み、最新順でソート）
 */
export async function getScoresServer() {
  const snap = await adminDb.collection("scores")
    .where("isDispTop", "==", true)
    .get();

  const getTime = (val: any): number => {
    if (!val) return 0;
    if (typeof val === "number") return val;
    if (typeof val.toMillis === "function") return val.toMillis();
    if (val instanceof Date) return val.getTime();
    if (typeof val === "string") {
      const parsed = Date.parse(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const scores = snap.docs.map(doc => {
    const data = toPlainObject(doc);
    return {
      ...data,
      youtubeId: utils.extractYouTubeId(data.referenceTrack)
    };
  }) as unknown as Score[];

  return scores.sort((a: any, b: any) => {
    const timeA = getTime(a.createdAt) || getTime(a.updatedAt);
    const timeB = getTime(b.createdAt) || getTime(b.updatedAt);
    return timeB - timeA;
  });
}

/**
 * 名盤紹介データ（更新頻度が低いため24時間キャッシュ）
 */
export const getBlueNotesServer = unstable_cache(
  async () => {
    const snap = await adminDb.collection("blueNotes").orderBy("__name__", "asc").get();
    return snap.docs.map(toPlainObject) as unknown as BlueNote[];
  },
  ["home-blue-notes-cache"],
  { revalidate: 86400 } // 24時間キャッシュ
);

export async function getMediasServer(count = 10) {
  const snap = await adminDb.collection("medias").orderBy("date", "desc").limit(count).get();
  return snap.docs.map(toPlainObject) as unknown as Media[];
}

export async function getCalendarDataServer() {
  const [eventsSnap, votesSnap, callsSnap, issuesSnap] = await Promise.all([
    adminDb.collection("events").get(),
    adminDb.collection("votes").get(),
    adminDb.collection("calls").get(),
    adminDb.collection("issues").get(),
  ]);

  const events = eventsSnap.docs.map(toPlainObject);
  const votes = votesSnap.docs.map(toPlainObject);
  const calls = callsSnap.docs.map(toPlainObject);
  const issues = issuesSnap.docs.map(toPlainObject);

  return { events, votes, calls, issues };
}
