import 'server-only';
import { adminDb } from "@/src/lib/firebase-admin";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { Media } from "@/src/lib/firestore/types";

/**
 * メディアデータを全件取得（サーバーサイド専用）
 */
export async function getMediasServer(count = 100): Promise<Media[]> {
  const snap = await adminDb.collection("medias").orderBy("date", "desc").limit(count).get();
  return snap.docs.map(toPlainObject) as Media[];
}

/**
 * 特定のメディアデータをIDで取得（サーバーサイド専用）
 */
export async function getMediaServer(mediaId: string): Promise<Media | null> {
  const docSnap = await adminDb.collection("medias").doc(mediaId).get();
  if (!docSnap.exists) return null;
  return toPlainObject(docSnap) as Media;
}
