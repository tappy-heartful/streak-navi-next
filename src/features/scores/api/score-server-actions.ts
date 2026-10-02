import 'server-only';
import { adminDb } from "@/src/lib/firebase-admin";
import * as utils from "@/src/lib/functions";
import { Genre, Score, EventWithSetlist } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * 全譜面データを取得（サーバーサイド専用）
 */
export async function getScoresServer() {
  const snap = await adminDb.collection("scores").orderBy("createdAt", "desc").get();
  return snap.docs.map(doc => {
    const data = toPlainObject(doc);
    return {
      ...data,
      youtubeId: utils.extractYouTubeId(data.referenceTrack)
    };
  }) as Score[];
}

/**
 * 特定の譜面データをIDで取得（サーバーサイド専用）
 */
export async function getScoreServer(scoreId: string) {
  const docSnap = await adminDb.collection("scores").doc(scoreId).get();
  if (!docSnap.exists) return null;

  const data = toPlainObject(docSnap);
  return {
    ...data,
    youtubeId: utils.extractYouTubeId(data.referenceTrack)
  } as Score;
}

import { unstable_cache } from "next/cache";

/**
 * ジャンル一覧を取得（24時間キャッシュ）
 */
export const getGenresServer = unstable_cache(
  async (): Promise<Genre[]> => {
    const snapshot = await adminDb.collection("genres").get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Genre[];
  },
  ["master-genres"],
  { revalidate: 86400, tags: ["master-genres"] }
);

/**
 * セットリストが存在する今後のイベントを取得（サーバーサイド専用）
 */
export async function getUpcomingEventsWithSetlistServer(): Promise<EventWithSetlist[]> {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
  const snap = await adminDb.collection("events")
    .where("date", ">=", today)
    .orderBy("date", "asc")
    .get();

  return snap.docs.map(doc => {
    const data = doc.data();
    const scoreIds = (data.setlist || []).flatMap((item: { songIds?: string[] }) => item.songIds || []);
    return {
      id: doc.id,
      title: data.title,
      date: data.date,
      scoreIdsInSetlist: scoreIds,
    };
  }).filter(e => e.scoreIdsInSetlist.length > 0);
}