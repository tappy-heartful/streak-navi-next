// src/lib/firestore/events.ts を新規作成
import { adminDb } from "../firebase-admin";
import { toPlainObject } from "./utils";

export async function getUpcomingEventsWithSetlistServer() {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
  const snap = await adminDb.collection("events")
    .where("date", ">=", today)
    .orderBy("date", "asc")
    .get();

  return snap.docs.map(doc => {
    const data = doc.data();
    // セットリストから曲IDを抽出
    const scoreIds = (data.setlist || []).flatMap((item: any) => item.songIds || []);
    return {
      id: doc.id,
      title: data.title_decoded || data.title,
      date: data.date,
      scoreIdsInSetlist: scoreIds,
    };
  }).filter(e => e.scoreIdsInSetlist.length > 0);
}