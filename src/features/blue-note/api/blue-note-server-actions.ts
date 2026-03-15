import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { BlueNote } from "@/src/lib/firestore/types";

export async function getBlueNotesServer(): Promise<BlueNote[]> {
  const snap = await adminDb.collection("blueNotes").get();
  return snap.docs.map(toPlainObject) as BlueNote[];
}
