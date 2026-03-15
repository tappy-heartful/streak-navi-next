import { collection, doc, addDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { archiveAndDeleteDoc, hyphenDateToDot } from "@/src/lib/functions";
import { NoticeBaseNotification } from "@/src/lib/firestore/types";

export type NoticeScheduleItemInput = {
  scheduledTime: string;
  message: string;
};

export type NoticeFormData = {
  relatedType: string;
  relatedId: string;
  relatedTitle: string;
  scheduledDate: string; // "yyyy-MM-dd"
  notifications: NoticeScheduleItemInput[];
};

export type NoticeBaseFormData = Record<string, NoticeBaseNotification[]>;

export async function saveNotice(
  mode: "new" | "edit" | "copy",
  data: NoticeFormData,
  noticeId?: string
): Promise<string> {
  const scheduledDateDot = data.scheduledDate ? hyphenDateToDot(data.scheduledDate) : "";
  const validNotifications = data.notifications.filter(n => n.scheduledTime && n.message);

  const payload = {
    relatedType: data.relatedType,
    relatedId: data.relatedId || "",
    relatedTitle: data.relatedTitle || "",
    schedules: scheduledDateDot
      ? [{ scheduledDate: scheduledDateDot, notifications: validNotifications }]
      : [],
    activeDate: scheduledDateDot,
    updatedAt: serverTimestamp(),
  };

  if (mode === "edit" && noticeId) {
    await updateDoc(doc(db, "notices", noticeId), payload);
    return noticeId;
  } else {
    const ref = await addDoc(collection(db, "notices"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }
}

export async function saveNoticeBase(data: NoticeBaseFormData): Promise<void> {
  await setDoc(doc(db, "configs", "noticeBase"), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
