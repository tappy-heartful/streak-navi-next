import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";
import {
  Event,
  EventAttendanceAnswer,
  EventAdjustAnswer,
  AttendanceStatus,
  EventAdjustStatus,
  EventRecording,
  Score,
  Section,
  User,
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
    website: d.website || "",
    access: d.access || "",
    googleMap: d.googleMap || "",
    schedule: d.schedule || "",
    dress: d.dress || "",
    bring: d.bring || "",
    rent: d.rent || "",
    other: d.other || "",
    allowAssign: d.allowAssign ?? false,
    setlist: d.setlist || [],
    instrumentConfig: d.instrumentConfig || {},
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
  usersMap: Record<string, User>;
  sectionsMap: Record<string, string>; // sectionId → name
  scoresMap: Record<string, Score>;
  attendanceStatuses: AttendanceStatus[];
  adjustStatuses: EventAdjustStatus[];
  recordings: EventRecording[];
  allUserUids: string[];
};

export async function fetchEventConfirmData(eventId: string): Promise<EventConfirmData | null> {
  const eventDoc = await adminDb.collection("events").doc(eventId).get();
  if (!eventDoc.exists) return null;
  const event = toEventDoc(eventDoc);

  const isSchedule = event.attendanceType === "schedule";
  const answerCollection = isSchedule ? "eventAdjustAnswers" : "eventAttendanceAnswers";

  const [
    answersSnap,
    usersSnap,
    sectionsSnap,
    scoresSnap,
    attendanceStatusesSnap,
    adjustStatusesSnap,
    recordingsSnap,
  ] = await Promise.all([
    adminDb.collection(answerCollection).get(),
    adminDb.collection("users").get(),
    adminDb.collection("sections").get(),
    adminDb.collection("scores").get(),
    adminDb.collection("attendanceStatuses").get(),
    adminDb.collection("eventAdjustStatus").get(),
    adminDb.collection("eventRecordings").where("eventId", "==", eventId).orderBy("createdAt", "asc").get(),
  ]);

  const answers = answersSnap.docs
    .filter(d => d.id.startsWith(eventId + "_"))
    .map(d => {
      const data = d.data();
      if (isSchedule) {
        return {
          id: d.id,
          eventId: data.eventId || eventId,
          uid: data.uid || d.id.replace(eventId + "_", ""),
          answers: data.answers || {},
          updatedAt: data.updatedAt?.toMillis?.() ?? 0,
        } as EventAdjustAnswer;
      } else {
        return {
          id: d.id,
          eventId: data.eventId || eventId,
          uid: data.uid || d.id.replace(eventId + "_", ""),
          status: data.status || "",
          updatedAt: data.updatedAt?.toMillis?.() ?? 0,
        } as EventAttendanceAnswer;
      }
    });

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
  sectionsSnap.docs
    .sort((a, b) => Number(a.id) - Number(b.id))
    .forEach(d => {
      sectionsMap[d.id] = d.data().name || "";
    });

  const scoresMap: Record<string, Score> = {};
  scoresSnap.docs.forEach(d => {
    const sd = d.data();
    scoresMap[d.id] = {
      id: d.id,
      title: sd.title || "",
      scoreUrl: sd.scoreUrl || "",
      referenceTrack: sd.referenceTrack || "",
    } as Score;
  });

  const attendanceStatuses: AttendanceStatus[] = attendanceStatusesSnap.docs.map(d => ({
    id: d.id,
    name: d.data().name || "",
  }));

  const adjustStatuses: EventAdjustStatus[] = adjustStatusesSnap.docs
    .map(d => ({ id: d.id, name: d.data().name || "" }))
    .sort((a, b) => a.id < b.id ? -1 : 1);

  const recordings: EventRecording[] = recordingsSnap.docs.map(d => ({
    id: d.id,
    eventId: d.data().eventId || eventId,
    uid: d.data().uid || "",
    title: d.data().title || "",
    url: d.data().url || "",
    createdAt: d.data().createdAt?.toMillis?.() ?? 0,
  }));

  return {
    event,
    answers,
    usersMap,
    sectionsMap,
    scoresMap,
    attendanceStatuses,
    adjustStatuses,
    recordings,
    allUserUids,
  };
}

export type EventEditData = {
  scores: Score[];
  sections: Section[];
};

export async function fetchEventEditData(): Promise<EventEditData> {
  const [scoresSnap, sectionsSnap] = await Promise.all([
    adminDb.collection("scores").orderBy("title", "asc").get(),
    adminDb.collection("sections").get(),
  ]);

  const scores: Score[] = scoresSnap.docs.map(d => ({
    id: d.id,
    title: d.data().title || "",
    referenceTrack: d.data().referenceTrack || "",
    scoreUrl: d.data().scoreUrl || "",
  })) as Score[];

  const sections: Section[] = sectionsSnap.docs
    .map(d => ({ id: d.id, name: d.data().name || "" }))
    .sort((a, b) => Number(a.id) - Number(b.id));

  return { scores, sections };
}

export async function fetchAttendanceAnswerPageData(eventId: string): Promise<{
  event: Event;
  attendanceStatuses: AttendanceStatus[];
} | null> {
  const [eventDoc, statusesSnap] = await Promise.all([
    adminDb.collection("events").doc(eventId).get(),
    adminDb.collection("attendanceStatuses").get(),
  ]);
  if (!eventDoc.exists) return null;
  const event = toEventDoc(eventDoc);
  const attendanceStatuses: AttendanceStatus[] = statusesSnap.docs.map(d => ({
    id: d.id,
    name: d.data().name || "",
  }));
  return { event, attendanceStatuses };
}

export async function fetchAdjustAnswerPageData(eventId: string): Promise<{
  event: Event;
  adjustStatuses: EventAdjustStatus[];
} | null> {
  const [eventDoc, statusesSnap] = await Promise.all([
    adminDb.collection("events").doc(eventId).get(),
    adminDb.collection("eventAdjustStatus").get(),
  ]);
  if (!eventDoc.exists) return null;
  const event = toEventDoc(eventDoc);
  const adjustStatuses: EventAdjustStatus[] = statusesSnap.docs
    .map(d => ({ id: d.id, name: d.data().name || "" }))
    .sort((a, b) => a.id < b.id ? -1 : 1);
  return { event, adjustStatuses };
}
