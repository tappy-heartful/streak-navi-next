import { adminDb } from "../firebase-admin";
import * as utils from "../functions";
import { Score } from "./types";
import { toPlainObject } from "./utils";

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

/**
 * 特定の譜面データをIDで取得
 */
export async function getScoreServer(scoreId: string) {
  const doc = await adminDb.collection("scores").doc(scoreId).get();
  
  if (!doc.exists) {
    return null;
  }

  const data = toPlainObject(doc);
  return {
    ...data,
    youtubeId: utils.extractYouTubeId(data.referenceTrack)
  } as unknown as Score;
}

/**
 * ジャンル一覧を取得
 */
export async function getGenresServer() {
  const snap = await adminDb.collection("genres").get();
  return snap.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  }));
}