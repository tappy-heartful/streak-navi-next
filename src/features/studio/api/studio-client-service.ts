import { db } from "@/src/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

export type StudioFormData = {
  prefecture: string;
  name: string;
  hp: string;
  map: string;
  availabilityInfo: string;
  fee: string;
  rooms: string[];
  roomsUrl: string;
  tel: string;
  reserve: string;
  access: string;
  note: string;
};

/**
 * スタジオデータの保存（登録・更新・コピー）
 */
export const saveStudio = async (
  mode: "new" | "edit" | "copy",
  data: StudioFormData,
  studioId?: string,
): Promise<string> => {
  // 空文字の部屋名は除去
  const rooms = data.rooms.filter(r => r.trim() !== "");

  const payload = {
    ...data,
    rooms,
    updatedAt: serverTimestamp(),
  };

  if (mode === "edit" && studioId) {
    const studioRef = doc(db, "studios", studioId);
    await updateDoc(studioRef, payload);
    return studioId;
  } else {
    const docRef = await addDoc(collection(db, "studios"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }
};
