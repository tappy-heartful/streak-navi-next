import 'server-only';
import { adminDb } from "@/src/lib/firebase-admin";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { Studio, Prefecture } from "@/src/lib/firestore/types";

/**
 * 都道府県一覧を order 順で取得（サーバーサイド専用）
 */
export async function getPrefecturesServer(): Promise<Prefecture[]> {
  const snap = await adminDb.collection("prefectures").orderBy("order", "asc").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Prefecture[];
}

/**
 * スタジオ一覧を全件取得（サーバーサイド専用）
 */
export async function getStudiosServer(): Promise<Studio[]> {
  const snap = await adminDb.collection("studios").get();
  return snap.docs.map(toPlainObject) as Studio[];
}

/**
 * 特定のスタジオをIDで取得（サーバーサイド専用）
 */
export async function getStudioServer(studioId: string): Promise<Studio | null> {
  const docSnap = await adminDb.collection("studios").doc(studioId).get();
  if (!docSnap.exists) return null;
  return toPlainObject(docSnap) as Studio;
}
