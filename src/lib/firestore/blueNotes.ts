import { adminDb } from "../firebase-admin";
import { BlueNote } from "./types";
import { toPlainObject } from "./utils";

export async function getBlueNotesServer() {
  const snap = await adminDb.collection("blueNotes").get();
  return snap.docs.map(toPlainObject) as unknown as BlueNote[];
}