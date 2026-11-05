"use server";

import { adminDb as db } from "@/src/lib/firebase-admin";
import { Assign, Event, Score, User, Section, Instrument, AssignComment } from "@/src/lib/firestore/types";
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
  const [scoresSnap, usersSnap, sectionsSnap, instrumentsSnap] = await Promise.all([
    db.collection("scores").get(),
    db.collection("users").get(),
    db.collection("sections").get(),
    db.collection("instruments").get(),
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

  const instruments: Record<string, Instrument> = {};
  instrumentsSnap.docs.forEach(doc => {
    instruments[doc.id] = toPlainObject(doc) as Instrument;
  });

  return { scores, users, sections, instruments };
}

/**
 * 指定したイベントの譜割りコメント一覧を取得（更新日時降順）
 */
export async function getAssignComments(eventId: string): Promise<AssignComment[]> {
  const snap = await db.collection("assignComments")
    .where("eventId", "==", eventId)
    .get();

  return snap.docs
    .map(doc => toPlainObject(doc) as AssignComment)
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
}

export interface PastAssignRecord {
  songId: string;
  partName: string;
  userId: string;
  eventDate: string;
}

/**
 * 過去のイベントの譜割り履歴を取得（現在のイベントを除く）
 */
export async function getPastAssignHistory(currentEventId: string): Promise<PastAssignRecord[]> {
  const eventsSnap = await db.collection("events")
    .where("allowAssign", "==", true)
    .get();

  const eventDateMap: Record<string, string> = {};
  eventsSnap.docs.forEach(doc => {
    if (doc.id !== currentEventId) {
      eventDateMap[doc.id] = doc.data().date || "";
    }
  });

  const pastEventIds = Object.keys(eventDateMap);
  if (pastEventIds.length === 0) return [];

  const assignsSnap = await db.collection("assigns").get();

  const records: PastAssignRecord[] = [];
  assignsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.eventId && data.eventId !== currentEventId && eventDateMap[data.eventId] !== undefined) {
      if (data.songId && data.partName && data.userId) {
        records.push({
          songId: data.songId,
          partName: data.partName,
          userId: data.userId,
          eventDate: eventDateMap[data.eventId] || "",
        });
      }
    }
  });

  return records;
}
