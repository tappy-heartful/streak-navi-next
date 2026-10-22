import 'server-only';
import { adminDb, adminStorage } from "@/src/lib/firebase-admin";
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
    // セキュリティ強化: Storage上のファイルはパブリックトークン付きURLをクライアントに漏洩させず空にする
    const rawFiles = Array.isArray(data.files) ? data.files : [];
    const files = rawFiles.map((f: any) => ({
      ...f,
      url: f.path ? "" : f.url || "",
    }));
    return {
      ...data,
      files,
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
  const rawFiles = Array.isArray(data.files) ? data.files : [];
  const files = rawFiles.map((f: any) => ({
    ...f,
    url: f.path ? "" : f.url || "",
  }));
  return {
    ...data,
    files,
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

/**
 * 既存の全譜面ファイルから公開トークン（downloadTokens）を無効化し、
 * Firestore上のurlもサニタイズするセキュリティメンテナンスタスク（サーバーサイド専用）
 */
export async function revokeAllScoreDownloadTokensServer() {
  let revokedFilesCount = 0;
  let updatedScoresCount = 0;

  try {
    // 1. Firebase Storage 上の scores/files/ 配下のオブジェクトからトークンを剥奪
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "streak-navi.firebasestorage.app";
    const bucket = adminStorage.bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix: "scores/files/" });

    for (const file of files) {
      try {
        const [meta] = await file.getMetadata();
        if (meta.metadata && meta.metadata.firebaseStorageDownloadTokens) {
          await file.setMetadata({
            metadata: {
              firebaseStorageDownloadTokens: null,
            },
          });
          revokedFilesCount++;
        }
      } catch (fErr) {
        console.warn(`[Storage Token Revoke] Failed for file: ${file.name}`, fErr);
      }
    }

    // 2. Firestore の scores コレクションの各ドキュメントの files 内の url を空にする
    const snap = await adminDb.collection("scores").get();
    for (const doc of snap.docs) {
      const data = doc.data();
      if (Array.isArray(data.files) && data.files.length > 0) {
        let changed = false;
        const newFiles = data.files.map((f: any) => {
          if (f.path && f.url) {
            changed = true;
            return { ...f, url: "" };
          }
          return f;
        });

        if (changed) {
          await doc.ref.update({ files: newFiles });
          updatedScoresCount++;
        }
      }
    }

    return {
      success: true,
      revokedFilesCount,
      updatedScoresCount,
    };
  } catch (err: any) {
    console.error("[Storage Token Revoke Error]:", err);
    return {
      success: false,
      error: err.message,
    };
  }
}