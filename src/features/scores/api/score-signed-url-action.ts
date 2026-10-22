"use server";

import { adminStorage } from "@/src/lib/firebase-admin";

/**
 * 譜面ファイルの一時的な署名付きURL（Signed URL）を発行する
 * 有効期限: 5分間（期限切れ後はURL直叩きしても403でアクセス不可）
 * iOS PWA / LINE内ブラウザ / Safari すべてで安全かつ確実に開けるGoogle公式の方式
 */
export async function getScoreSignedUrl(storagePath: string, fileName: string): Promise<string> {
  if (!storagePath || !storagePath.startsWith("scores/files/")) {
    throw new Error("Invalid score path");
  }

  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "streak-navi.firebasestorage.app";
  const bucket = adminStorage.bucket(bucketName);
  const file = bucket.file(storagePath);

  const lower = fileName.toLowerCase();
  let contentType = "application/octet-stream";
  if (lower.endsWith(".pdf")) contentType = "application/pdf";
  else if (lower.endsWith(".png")) contentType = "image/png";
  else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
  else if (lower.endsWith(".webp")) contentType = "image/webp";
  else if (lower.endsWith(".mp3")) contentType = "audio/mpeg";

  // 5分間有効な署名付きURLを生成 (ブラウザ内閲覧 inline)
  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 5 * 60 * 1000,
    responseDisposition: "inline",
    contentType,
  });

  return signedUrl;
}
