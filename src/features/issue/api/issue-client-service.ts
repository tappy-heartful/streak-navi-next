"use client";

import { db } from "@/src/lib/firebase";
import { 
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { getSession } from "@/src/lib/functions";
import { Issue } from "@/src/lib/firestore/types";

/** チケットの保存 (新規作成・更新・コピー) */
export const saveIssue = async (
  mode: "new" | "edit" | "copy",
  data: Omit<Issue, "id" | "createdBy" | "createdByName" | "createdAt" | "updatedAt">,
  actorName: string,
  id?: string
): Promise<string> => {
  const uid = getSession("uid");
  if (!uid) throw new Error("ログインが必要です");

  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (mode === "edit" && id) {
    const docRef = doc(db, "issues", id);
    await updateDoc(docRef, payload);
    return id;
  } else {
    const res = await addDoc(collection(db, "issues"), {
      ...payload,
      createdBy: uid,
      createdByName: actorName,
      createdAt: serverTimestamp(),
    });
    return res.id;
  }
};

/** チケットの削除 (アーカイブ) */
export const deleteIssue = async (id: string) => {
  const { archiveAndDeleteDoc } = await import("@/src/lib/functions");
  await archiveAndDeleteDoc("issues", id);
};

/** チェックリストのステップ状態を切り替え */
export const toggleIssueStep = async (
  issueId: string,
  stepIndex: number,
  completed: boolean
) => {
  const docRef = doc(db, "issues", issueId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  
  const steps = snap.data().steps || [];
  if (steps[stepIndex]) {
    steps[stepIndex].completed = completed;
    await updateDoc(docRef, {
      steps,
      updatedAt: serverTimestamp()
    });
  }
};
