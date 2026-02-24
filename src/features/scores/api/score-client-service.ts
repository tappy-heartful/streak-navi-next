import { db } from "@/src/lib/firebase"; // クライアント用SDK
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * 譜面データの保存（登録・更新・コピー）
 * クライアントサイドのFirebase SDKを使用して書き込みを行う
 */
export const saveScore = async (
  mode: "new" | "edit" | "copy",
  data: any,
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