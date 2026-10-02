import "server-only";
import admin from "firebase-admin";
import { adminDb } from "@/src/lib/firebase-admin";
import { unstable_cache } from "next/cache";
import {
  getSectionsServer,
  getInstrumentsServer,
  getPrefecturesServer,
} from "@/src/features/users/api/user-server-actions";
import {
  Event,
  EventAttendanceAnswer,
  EventAdjustAnswer,
  AttendanceStatus,
  EventAdjustStatus,
  EventRecording,
  Score,
  Section,
  Instrument,
  User,
  Prefecture,
} from "@/src/lib/firestore/types";

function toEventDoc(doc: FirebaseFirestore.DocumentSnapshot): Event {
  const d = doc.data()!;
  return {
    id: doc.id,
    title: d.title || "",
    attendanceType: d.attendanceType || "attendance",
    date: d.date || "",
    candidateDates: d.candidateDates || [],
    acceptStartDate: d.acceptStartDate || "",
    acceptEndDate: d.acceptEndDate || "",
    placeName: d.placeName || "",
    prefectureId: d.prefectureId || "",
    municipalityId: d.municipalityId || "",
    website: d.website || "",
    access: d.access || "",
    googleMap: d.googleMap || "",
    youtubeUrl: d.youtubeUrl || "",
    youtubeTimestamps: (d.youtubeTimestamps || []).map((t: any) => ({
      time: t.time || "",
      comment: t.comment || "",
    })),
    rentTimeRanges: (d.rentTimeRanges || []).map((t: any) => ({
      startTime: t.startTime || "",
      endTime: t.endTime || "",
    })),
    schedule: d.schedule || "",
    dress: d.dress || "",
    bring: d.bring || "",
    rent: d.rent || "",
    other: d.other || "",
    allowAssign: d.allowAssign ?? false,
    setlist: d.setlist || [],
    instrumentConfig: d.instrumentConfig || {},
    isVenueReserved: d.isVenueReserved ?? false,
    createdBy: d.createdBy || "",
    createdAt: d.createdAt?.toMillis?.() ?? 0,
    updatedAt: d.updatedAt?.toMillis?.() ?? 0,
  };
}

export async function fetchEvents(): Promise<Event[]> {
  const snap = await adminDb.collection("events").orderBy("date", "asc").get();
  return snap.docs.map(toEventDoc);
}

export async function fetchEvent(id: string): Promise<Event | null> {
  const doc = await adminDb.collection("events").doc(id).get();
  if (!doc.exists) return null;
  return toEventDoc(doc);
}

export type EventConfirmData = {
  event: Event;
  answers: (EventAttendanceAnswer | EventAdjustAnswer)[];
  attendanceAnswers: EventAttendanceAnswer[];
  adjustAnswers: EventAdjustAnswer[];
  usersMap: Record<string, User>;
  sectionsMap: Record<string, string>; // sectionId → name
  scoresMap: Record<string, Score>;
  attendanceStatuses: AttendanceStatus[];
  adjustStatuses: EventAdjustStatus[];
  recordings: EventRecording[];
  allUserUids: string[];
  prefectureName?: string;
  municipalityName?: string;
};

export async function fetchEventConfirmData(eventId: string): Promise<EventConfirmData | null> {
  const eventDoc = await adminDb.collection("events").doc(eventId).get();
  if (!eventDoc.exists) return null;
  const event = toEventDoc(eventDoc);

  const isSchedule = event.attendanceType === "schedule";

  // セットリストに含まれる曲IDのみを抽出（全譜面取得を防止）
  const targetScoreIds = Array.from(
    new Set((event.setlist || []).flatMap((item: { songIds?: string[] }) => item.songIds || []))
  ).filter(Boolean) as string[];

  const fetchScoresPromise = async (): Promise<FirebaseFirestore.DocumentSnapshot[]> => {
    if (targetScoreIds.length === 0) return [];
    if (targetScoreIds.length <= 30) {
      const snap = await adminDb
        .collection("scores")
        .where(admin.firestore.FieldPath.documentId(), "in", targetScoreIds)
        .get();
      return snap.docs;
    }
    const docs: FirebaseFirestore.DocumentSnapshot[] = [];
    for (let i = 0; i < targetScoreIds.length; i += 30) {
      const chunk = targetScoreIds.slice(i, i + 30);
      const snap = await adminDb
        .collection("scores")
        .where(admin.firestore.FieldPath.documentId(), "in", chunk)
        .get();
      docs.push(...snap.docs);
    }
    return docs;
  };

  const [
    attendanceAnswersSnap,
    adjustAnswersSnap,
    usersSnap,
    sectionsList,
    scoresDocs,
    attendanceStatuses,
    adjustStatuses,
    recordingsSnap,
  ] = await Promise.all([
    adminDb.collection("eventAttendanceAnswers").where("eventId", "==", eventId).get(),
    adminDb.collection("eventAdjustAnswers").where("eventId", "==", eventId).get(),
    adminDb.collection("users").get(),
    getSectionsServer(),
    fetchScoresPromise(),
    getAttendanceStatusesServer(),
    getEventAdjustStatusesServer(),
    adminDb.collection("eventRecordings").where("eventId", "==", eventId).orderBy("createdAt", "asc").get(),
  ]);

  const attendanceAnswers = attendanceAnswersSnap.docs
    .filter(d => d.id.startsWith(eventId + "_"))
    .map(d => {
      const data = d.data();
      return {
        id: d.id,
        eventId: data.eventId || eventId,
        uid: data.uid || d.id.replace(eventId + "_", ""),
        status: data.status || "",
        comment: data.comment || "",
        updatedAt: data.updatedAt?.toMillis?.() ?? 0,
      } as EventAttendanceAnswer;
    });

  const adjustAnswers = adjustAnswersSnap.docs
    .filter(d => d.id.startsWith(eventId + "_"))
    .map(d => {
      const data = d.data();
      return {
        id: d.id,
        eventId: data.eventId || eventId,
        uid: data.uid || d.id.replace(eventId + "_", ""),
        answers: data.answers || {},
        comment: data.comment || "",
        updatedAt: data.updatedAt?.toMillis?.() ?? 0,
      } as EventAdjustAnswer;
    });

  const answers = isSchedule ? adjustAnswers : attendanceAnswers;

  const usersMap: Record<string, User> = {};
  const allUserUids: string[] = [];
  usersSnap.docs.forEach(d => {
    const data = d.data();
    usersMap[d.id] = {
      id: d.id,
      displayName: data.displayName || "",
      pictureUrl: data.pictureUrl || "",
      sectionId: data.sectionId || "",
    };
    allUserUids.push(d.id);
  });

  const sectionsMap: Record<string, string> = {};
  sectionsList
    .slice()
    .sort((a, b) => Number(a.id) - Number(b.id))
    .forEach(s => {
      sectionsMap[s.id] = s.name || "";
    });

  const scoresMap: Record<string, Score> = {};
  scoresDocs.forEach(d => {
    const sd = d.data();
    if (!sd) return;
    scoresMap[d.id] = {
      id: d.id,
      title: sd.title || "",
      scoreUrl: sd.scoreUrl || "",
      referenceTrack: sd.referenceTrack || "",
    } as Score;
  });

  const recordings: EventRecording[] = recordingsSnap.docs.map(d => ({
    id: d.id,
    eventId: d.data().eventId || eventId,
    uid: d.data().uid || "",
    title: d.data().title || "",
    url: d.data().url || "",
    createdAt: d.data().createdAt?.toMillis?.() ?? 0,
  }));

  let prefectureName = "";
  let municipalityName = "";

  if (event.prefectureId) {
    const prefDoc = await adminDb.collection("prefectures").doc(event.prefectureId).get();
    if (prefDoc.exists) {
      prefectureName = prefDoc.data()?.name || "";
    }
  }

  if (event.municipalityId) {
    const munDoc = await adminDb.collection("municipalities").doc(event.municipalityId).get();
    if (munDoc.exists) {
      municipalityName = munDoc.data()?.name || "";
    }
  }

  return {
    event,
    answers,
    attendanceAnswers,
    adjustAnswers,
    usersMap,
    sectionsMap,
    scoresMap,
    attendanceStatuses,
    adjustStatuses,
    recordings,
    allUserUids,
    prefectureName,
    municipalityName,
  };
}

/**
 * 全出欠ステータス情報を取得（24時間キャッシュ）
 */
export const getAttendanceStatusesServer = unstable_cache(
  async (): Promise<AttendanceStatus[]> => {
    const snap = await adminDb.collection("attendanceStatuses").get();
    return snap.docs.map(d => ({
      id: d.id,
      name: d.data().name || "",
    }));
  },
  ["master-attendance-statuses"],
  { revalidate: 86400, tags: ["master-attendance-statuses"] }
);

/**
 * 全日程調整ステータス情報を取得（24時間キャッシュ）
 */
export const getEventAdjustStatusesServer = unstable_cache(
  async (): Promise<EventAdjustStatus[]> => {
    const snap = await adminDb.collection("eventAdjustStatus").get();
    return snap.docs
      .map(d => ({ id: d.id, name: d.data().name || "" }))
      .sort((a, b) => (a.id < b.id ? -1 : 1));
  },
  ["master-event-adjust-statuses"],
  { revalidate: 86400, tags: ["master-event-adjust-statuses"] }
);

export type EventEditData = {
  scores: Score[];
  sections: Section[];
  instruments: Instrument[];
  prefectures: Prefecture[];
};

export async function fetchEventEditData(): Promise<EventEditData> {
  const [scoresSnap, sections, instruments, prefectures] = await Promise.all([
    adminDb.collection("scores").orderBy("title", "asc").get(),
    getSectionsServer(),
    getInstrumentsServer(),
    getPrefecturesServer(),
  ]);

  const scores: Score[] = scoresSnap.docs.map(d => ({
    id: d.id,
    title: d.data().title || "",
    referenceTrack: d.data().referenceTrack || "",
    scoreUrl: d.data().scoreUrl || "",
  })) as Score[];

  return { scores, sections, instruments, prefectures };
}

export async function fetchAttendanceAnswerPageData(eventId: string): Promise<{
  event: Event;
  attendanceStatuses: AttendanceStatus[];
} | null> {
  const [eventDoc, attendanceStatuses] = await Promise.all([
    adminDb.collection("events").doc(eventId).get(),
    getAttendanceStatusesServer(),
  ]);
  if (!eventDoc.exists) return null;
  const event = toEventDoc(eventDoc);
  return { event, attendanceStatuses };
}

export async function fetchAdjustAnswerPageData(eventId: string): Promise<{
  event: Event;
  adjustStatuses: EventAdjustStatus[];
} | null> {
  const [eventDoc, adjustStatuses] = await Promise.all([
    adminDb.collection("events").doc(eventId).get(),
    getEventAdjustStatusesServer(),
  ]);
  if (!eventDoc.exists) return null;
  const event = toEventDoc(eventDoc);
  return { event, adjustStatuses };
}
