"use server";

import { adminDb as db } from "@/src/lib/firebase-admin";
import { Assign, Event, Score, User, Section } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * 譜割り対象のイベント一覧を取得（日付降順）
 */
export async function getAssignEvents() {
  const snap = await db.collection("events")
    .where("allowAssign", "==", true)
    .orderBy("date", "desc")
    .get();

  return snap.docs.map(doc => toPlainObject(doc) as Event);
}

/**
 * 指定したイベントの譜割りデータを取得
 */
export async function getAssignsByEvent(eventId: string) {
  const snap = await db.collection("assigns")
    .where("eventId", "==", eventId)
    .get();

  return snap.docs.map(doc => toPlainObject(doc) as Assign);
}

/**
 * イベント詳細を取得
 */
export async function getEventById(eventId: string) {
  const doc = await db.collection("events").doc(eventId).get();
  if (!doc.exists) return null;
  return toPlainObject(doc) as Event;
}

/**
 * 譜割りに関連する全情報を一括取得（マスターデータ）
 */
export async function getAssignMasterData() {
  const [scoresSnap, usersSnap, sectionsSnap] = await Promise.all([
    db.collection("scores").get(),
    db.collection("users").get(),
    db.collection("sections").get(),
  ]);

  const scores: Record<string, Score> = {};
  scoresSnap.docs.forEach(doc => {
    scores[doc.id] = toPlainObject(doc) as Score;
  });

  const users: Record<string, User> = {};
  usersSnap.docs.forEach(doc => {
    users[doc.id] = toPlainObject(doc) as User;
  });

  const sections: Record<string, Section> = {};
  sectionsSnap.docs.forEach(doc => {
    sections[doc.id] = toPlainObject(doc) as Section;
  });

  return { scores, users, sections };
}
