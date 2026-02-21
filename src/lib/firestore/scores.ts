import { adminDb } from "../firebase-admin";
import * as utils from "../functions";
import { Score } from "./types";
import { toPlainObject } from "./utils";

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

// src/lib/firestore/scores.ts に追加
export async function getGenresServer() {
  const snap = await adminDb.collection("genres").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}