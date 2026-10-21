import { db, auth } from "@/src/lib/firebase"; // クライアント用SDK
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ScoreFile } from "@/src/lib/firestore/types";
import { getSession, getJSTDate, formatDateToYMDDot } from "@/src/lib/functions";

export type ScoreFormData = {
  title: string;
  files?: ScoreFile[];
  referenceTrack: string;
  genres: string[];
  abbreviation: string;
  note: string;
  isDispTop: boolean;
};

/**
 * 譜面データの保存（登録・更新・コピー）
 * クライアントサイドのFirebase SDKを使用して書き込みを行う
 */
export const saveScore = async (
  mode: "new" | "edit" | "copy",
  data: ScoreFormData,
  scoreId?: string,
  userDisplayName?: string
) => {
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (mode === "edit" && scoreId) {
    // 更新処理
    const scoreRef = doc(db, "scores", scoreId);
    await updateDoc(scoreRef, payload);
    return scoreId;
  } else {
    // 新規登録 または コピー処理
    const docRef = await addDoc(collection(db, "scores"), {
      ...payload,
      createdAt: serverTimestamp(),
      createdBy: userDisplayName || "Unknown",
    });
    return docRef.id;
  }
};

export type RecordScoreDownloadParams = {
  scoreId?: string;
  scoreTitle: string;
  fileName: string;
  fileUrl: string;
  user?: { uid: string; displayName?: string | null } | null;
};

/**
 * 譜面ダウンロード・閲覧ログの記録
 * 専用コレクション `scoreDownloadLogs` に記録する
 */
export const recordScoreDownloadLog = async ({
  scoreId,
  scoreTitle,
  fileName,
  fileUrl,
  user,
}: RecordScoreDownloadParams) => {
  try {
    const currentAuthUser = auth.currentUser;
    const uid = user?.uid || currentAuthUser?.uid || getSession("uid") || "unknown";
    const userName =
      user?.displayName ||
      currentAuthUser?.displayName ||
      getSession("displayName") ||
      "不明";

    const jstNow = getJSTDate();
    const dateStr = formatDateToYMDDot(jstNow);

    await addDoc(collection(db, "scoreDownloadLogs"), {
      uid,
      userName,
      scoreId: scoreId || "",
      scoreTitle,
      fileName,
      fileUrl,
      date: dateStr,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Score download log error:", err);
  }
};