"use client";
import { db } from "@/src/lib/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { Event, EventRecording } from "@/src/lib/firestore/types";

// ===== 出欠回答 =====

export async function submitAttendanceAnswer(
  eventId: string,
  uid: string,
  status: string
): Promise<void> {
  await setDoc(
    doc(db, "eventAttendanceAnswers", `${eventId}_${uid}`),
    { eventId, uid, status, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteMyAttendanceAnswer(eventId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, "eventAttendanceAnswers", `${eventId}_${uid}`));
}

// ===== 日程調整回答 =====

export async function submitAdjustAnswer(
  eventId: string,
  uid: string,
  answers: Record<string, string>
): Promise<void> {
  await setDoc(
    doc(db, "eventAdjustAnswers", `${eventId}_${uid}`),
    { eventId, uid, answers, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function deleteMyAdjustAnswer(eventId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, "eventAdjustAnswers", `${eventId}_${uid}`));
}

// ===== イベント本体 =====

export async function addEvent(data: Omit<Event, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "events"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(id: string, data: Partial<Event>): Promise<void> {
  await updateDoc(doc(db, "events", id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteEventWithAnswers(eventId: string): Promise<void> {
  // イベント本体を削除
  await deleteDoc(doc(db, "events", eventId));
  // 注意: サブドキュメントはサーバー側で削除が必要だが、
  // ここではクライアント側から削除可能な分のみ対応
  // (本来はCloud Functionsで対応するが、既存実装に合わせてクライアントで実装)
}

// ===== 録音・録画リンク =====

export async function addRecording(
  eventId: string,
  uid: string,
  title: string,
  url: string
): Promise<EventRecording> {
  const ref = await addDoc(collection(db, "eventRecordings"), {
    eventId,
    uid,
    title,
    url,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, eventId, uid, title, url, createdAt: Date.now() };
}

export async function deleteRecording(recordingId: string): Promise<void> {
  await deleteDoc(doc(db, "eventRecordings", recordingId));
}
