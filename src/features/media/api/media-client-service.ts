import { db } from "@/src/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

export type MediaFormData = {
  date: string;
  title: string;
  instagramUrl: string;
  youtubeUrl: string;
  driveUrl: string;
  isDispTop: boolean;
};

/**
 * メディアデータの保存（登録・更新・コピー）
 * date は HTML input が返す "yyyy-MM-dd" を Firestore 保存形式 "yyyy.MM.dd" に変換する
 */
export const saveMedia = async (
  mode: "new" | "edit" | "copy",
  data: MediaFormData,
  mediaId?: string,
): Promise<string> => {
  const payload = {
    ...data,
    date: data.date.replace(/-/g, "."),
    updatedAt: serverTimestamp(),
  };

  if (mode === "edit" && mediaId) {
    const mediaRef = doc(db, "medias", mediaId);
    await updateDoc(mediaRef, payload);
    return mediaId;
  } else {
    const docRef = await addDoc(collection(db, "medias"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }
};
