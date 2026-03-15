import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";
import { Notice, NoticeBaseNotification } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

export async function getNoticesServer(): Promise<Notice[]> {
  const snap = await adminDb.collection("notices").get();
  return snap.docs.map(doc => toPlainObject(doc) as Notice);
}

export async function getNoticeServer(noticeId: string): Promise<Notice | null> {
  const doc = await adminDb.collection("notices").doc(noticeId).get();
  if (!doc.exists) return null;
  return toPlainObject(doc) as Notice;
}

export type NoticeBaseData = Record<string, NoticeBaseNotification[]>;

export async function getNoticeBaseServer(): Promise<NoticeBaseData> {
  const doc = await adminDb.collection("configs").doc("noticeBase").get();
  if (!doc.exists) return {};
  const d = doc.data()!;
  const result: NoticeBaseData = {};
  // Timestamp フィールドを除いてそのまま返す（配列フィールドのみ）
  for (const key of Object.keys(d)) {
    if (Array.isArray(d[key])) {
      result[key] = d[key] as NoticeBaseNotification[];
    }
  }
  return result;
}
