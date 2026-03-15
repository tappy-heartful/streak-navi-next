import { db } from "@/src/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, getDoc, setDoc } from "firebase/firestore";
import { archiveAndDeleteDoc } from "@/src/lib/functions";
import { CallAnswer, CallAnswerSong } from "@/src/lib/firestore/types";

export type CallFormData = {
  title: string;
  description: string;
  acceptStartDate: string; // "yyyy-MM-dd" (HTML date input形式)
  acceptEndDate: string;   // "yyyy-MM-dd" (HTML date input形式)
  items: string[];         // 募集ジャンル一覧
  isAnonymous: boolean;
};

/**
 * 曲募集の保存（登録・更新・コピー）
 * 日付は "yyyy-MM-dd" → "yyyy.MM.dd" に変換して保存
 */
export const saveCall = async (
  mode: "new" | "edit" | "copy",
  data: CallFormData,
  callId?: string,
  userDisplayName?: string,
): Promise<string> => {
  const payload = {
    title: data.title,
    description: data.description,
    acceptStartDate: data.acceptStartDate.replace(/-/g, "."),
    acceptEndDate: data.acceptEndDate.replace(/-/g, "."),
    items: data.items.filter(i => i.trim() !== ""),
    isAnonymous: data.isAnonymous,
    updatedAt: serverTimestamp(),
  };

  if (mode === "edit" && callId) {
    await updateDoc(doc(db, "calls", callId), payload);
    return callId;
  } else {
    const docRef = await addDoc(collection(db, "calls"), {
      ...payload,
      createdBy: userDisplayName || "",
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }
};

/**
 * 曲募集と紐づく全回答を削除（管理者のみ）
 */
export const deleteCallWithAnswers = async (callId: string): Promise<void> => {
  await archiveAndDeleteDoc("calls", callId);

  const snap = await getDocs(collection(db, "callAnswers"));
  await Promise.all(
    snap.docs
      .filter(d => d.id.startsWith(callId + "_"))
      .map(d => archiveAndDeleteDoc("callAnswers", d.id))
  );
};

/**
 * 自分の回答を取り消す
 */
export const deleteMyCallAnswer = async (callId: string, uid: string): Promise<void> => {
  await archiveAndDeleteDoc("callAnswers", `${callId}_${uid}`);
};

/**
 * 自分の既存回答を取得（未回答の場合は null）
 */
export const getMyCallAnswer = async (callId: string, uid: string): Promise<CallAnswer | null> => {
  const snap = await getDoc(doc(db, "callAnswers", `${callId}_${uid}`));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    uid: data.uid as string,
    answers: (data.answers || {}) as { [genre: string]: CallAnswerSong[] },
  };
};

/**
 * 回答を保存（新規 or 更新）
 */
export const saveCallAnswer = async (
  callId: string,
  uid: string,
  answers: { [genre: string]: CallAnswerSong[] },
): Promise<void> => {
  await setDoc(
    doc(db, "callAnswers", `${callId}_${uid}`),
    { callId, uid, answers, updatedAt: serverTimestamp() },
    { merge: true },
  );
};
