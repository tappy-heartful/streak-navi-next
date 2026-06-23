"use client";

import { db } from "@/src/lib/firebase";
import { 
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { getSession } from "@/src/lib/functions";
import { Issue, IssueGroup, IssueComment } from "@/src/lib/firestore/types";
import { notifyIssueAction } from "./issue-notification-server-actions";

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
    notifyIssueAction(id, "update", uid);
    return id;
  } else {
    const res = await addDoc(collection(db, "issues"), {
      ...payload,
      createdBy: uid,
      createdByName: actorName,
      createdAt: serverTimestamp(),
    });
    notifyIssueAction(res.id, "create", uid);
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

/** グループの保存 (新規作成・更新) */
export const saveIssueGroup = async (
  mode: "new" | "edit",
  name: string,
  id?: string
): Promise<string> => {
  const uid = getSession("uid");
  if (!uid) throw new Error("ログインが必要です");

  const payload = {
    name,
    updatedAt: serverTimestamp(),
  };

  if (mode === "edit" && id) {
    const docRef = doc(db, "issueGroups", id);
    await updateDoc(docRef, payload);
    return id;
  } else {
    const res = await addDoc(collection(db, "issueGroups"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return res.id;
  }
};

/** グループの削除 */
export const deleteIssueGroup = async (id: string) => {
  const uid = getSession("uid");
  if (!uid) throw new Error("ログインが必要です");
  const docRef = doc(db, "issueGroups", id);
  await deleteDoc(docRef);
};

/** 子TODOとして設定する (parentIdを更新) */
export const updateIssueParent = async (issueId: string, parentId: string) => {
  const uid = getSession("uid");
  if (!uid) throw new Error("ログインが必要です");
  const docRef = doc(db, "issues", issueId);
  await updateDoc(docRef, {
    parentId,
    updatedAt: serverTimestamp()
  });
};

/** コメントの追加 */
export const addIssueComment = async (
  issueId: string,
  text: string,
  actorName: string
): Promise<string> => {
  const uid = getSession("uid");
  if (!uid) throw new Error("ログインが必要です");

  const commentsCol = collection(db, "issues", issueId, "comments");
  const res = await addDoc(commentsCol, {
    issueId,
    text,
    createdBy: uid,
    createdByName: actorName,
    createdAt: serverTimestamp(),
  });
  return res.id;
};

/** コメントの更新 */
export const updateIssueComment = async (
  issueId: string,
  commentId: string,
  text: string
): Promise<void> => {
  const uid = getSession("uid");
  if (!uid) throw new Error("ログインが必要です");

  const commentDocRef = doc(db, "issues", issueId, "comments", commentId);
  const snap = await getDoc(commentDocRef);
  if (!snap.exists()) throw new Error("コメントが見つかりません");
  if (snap.data().createdBy !== uid) {
    throw new Error("自分のコメントのみ編集できます");
  }

  await updateDoc(commentDocRef, {
    text,
    updatedAt: serverTimestamp(),
  });
};

/** チケットのステータスを更新 */
export const updateIssueStatus = async (
  issueId: string,
  status: "not_started" | "in_progress" | "completed"
) => {
  const uid = getSession("uid");
  if (!uid) throw new Error("ログインが必要です");

  const docRef = doc(db, "issues", issueId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp()
  });
  notifyIssueAction(issueId, "update", uid);
};
