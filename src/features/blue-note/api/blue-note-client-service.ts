"use client";
import { db } from "@/src/lib/firebase";
import { 
  collection, getDocs, doc, setDoc, deleteDoc, 
  serverTimestamp, getDoc 
} from "firebase/firestore";
import { BlueNote } from "@/src/lib/firestore/types";
import { archiveAndDeleteDoc } from "@/src/lib/functions";

export async function fetchBlueNotes(): Promise<BlueNote[]> {
  const snap = await getDocs(collection(db, "blueNotes"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BlueNote));
}

export async function saveBlueNote(dateId: string, data: {
  title: string;
  youtubeId: string;
  createdBy: string;
}): Promise<void> {
  await setDoc(doc(db, "blueNotes", dateId), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteBlueNote(dateId: string): Promise<void> {
  await archiveAndDeleteDoc("blueNotes", dateId);
}

export async function getBlueNote(dateId: string): Promise<BlueNote | null> {
  const snap = await getDoc(doc(db, "blueNotes", dateId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as BlueNote;
}
