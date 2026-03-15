import { db } from "@/src/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * ユーザデータの更新
 * @param uid ユーザID
 * @param data 更新データ
 */
export const saveUser = async (uid: string, data: Record<string, unknown>) => {
  const userRef = doc(db, "users", uid);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(userRef, payload);
  return uid;
};
