import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { Live, Score } from "@/src/lib/firestore/types";

export async function getLivesServer(): Promise<Live[]> {
  const snap = await adminDb.collection("lives").orderBy("date", "desc").get();
  return snap.docs.map(toPlainObject) as Live[];
}

export async function getLiveServer(liveId: string): Promise<Live | null> {
  const docSnap = await adminDb.collection("lives").doc(liveId).get();
  if (!docSnap.exists) return null;
  return toPlainObject(docSnap) as Live;
}

export async function fetchLiveEditData(): Promise<{ scores: Score[] }> {
  const scoresSnap = await adminDb.collection("scores").orderBy("title", "asc").get();
  const scores: Score[] = scoresSnap.docs.map(d => ({
    id: d.id,
    title: d.data().title || "",
    referenceTrack: d.data().referenceTrack || "",
    scoreUrl: d.data().scoreUrl || "",
  })) as Score[];

  return { scores };
}
