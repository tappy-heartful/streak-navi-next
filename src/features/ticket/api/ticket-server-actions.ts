import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { Live } from "@/src/lib/firestore/types";

export async function getLivesForTicketServer(): Promise<Live[]> {
  const snap = await adminDb.collection("lives").orderBy("date", "desc").get();
  return snap.docs.map(toPlainObject) as Live[];
}
