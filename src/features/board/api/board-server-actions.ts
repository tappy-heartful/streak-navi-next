import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";
import { Board } from "@/src/lib/firestore/types";

export async function getBoards(): Promise<Board[]> {
  const snapshot = await adminDb.collection("boards").orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc: any) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toMillis?.() || data.createdAt || 0,
      updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || 0,
    } as Board;
  });
}

export async function getBoard(id: string): Promise<Board | null> {
  const doc = await adminDb.collection("boards").doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toMillis?.() || data.createdAt || 0,
    updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || 0,
  } as Board;
}
