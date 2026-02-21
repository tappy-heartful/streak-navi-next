import { adminDb } from "../firebase-admin";
import { Media } from "./types";
import { toPlainObject } from "./utils";

export async function getMediasServer(count = 10) {
  const snap = await adminDb.collection("medias").orderBy("date", "desc").limit(count).get();
  return snap.docs.map(toPlainObject) as unknown as Media[];
}