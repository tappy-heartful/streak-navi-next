import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  query, 
  where,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { Assign } from "@/src/lib/firestore/types";
import { archiveAndDeleteDoc } from "@/src/lib/functions";

/**
 * 譜割りを保存（新規または更新）
 */
export async function saveAssign(eventId: string, songId: string, partName: string, data: Partial<Assign>) {
  // vanillaのID生成ロジックを踏襲: ${eventId}_${songId}_${safePartName}
  const safePartName = (partName || "").replace(/[^a-zA-Z0-9]/g, "");
  const assignId = `${eventId}_${songId}_${safePartName.substring(0, 8)}`;
  
  const ref = doc(db, "assigns", assignId);
  await setDoc(ref, {
    ...data,
    eventId,
    songId,
    partName,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  
  return assignId;
}

/**
 * 譜割りを解除（削除）
 */
export async function releaseAssign(eventId: string, songId: string, partName: string) {
  const safePartName = (partName || "").replace(/[^a-zA-Z0-9]/g, "");
  const assignId = `${eventId}_${songId}_${safePartName.substring(0, 8)}`;
  
  await archiveAndDeleteDoc("assigns", assignId);
}

/**
 * 譜割りコメントを保存（新規または更新）
 */
export async function saveAssignComment(
  eventId: string,
  uid: string,
  type: "all" | "section",
  comment: string,
  sectionId?: string
) {
  const commentId = `${eventId}_${uid}_${type}`;
  const ref = doc(db, "assignComments", commentId);
  await setDoc(ref, {
    eventId,
    uid,
    type,
    comment,
    sectionId: sectionId || null,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
  return commentId;
}

/**
 * 譜割りコメントを削除
 */
export async function deleteAssignComment(eventId: string, uid: string, type: "all" | "section") {
  const commentId = `${eventId}_${uid}_${type}`;
  await archiveAndDeleteDoc("assignComments", commentId);
}
