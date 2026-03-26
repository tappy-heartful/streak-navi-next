import { db } from "@/src/lib/firebase";
import { doc, updateDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { getSession } from "@/src/lib/functions";
import { notifyExpenseReview } from "../../expense-apply/api/expense-notification-server-actions";

/** 審査結果の反映 (経理メンバーのみが実行可能) */
export const judgeExpenseApply = async (
  id: string,
  status: 'approved' | 'returned',
  adminComment: string,
  reviewerName: string
) => {
  const reviewerId = getSession("uid");
  if (!reviewerId) throw new Error("ログインが必要です");

  const docRef = doc(db, "expenseApplies", id);
  await updateDoc(docRef, {
    status,
    adminComment: adminComment || "",
    reviewerId,
    reviewerName,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 履歴に追加
  await addDoc(collection(docRef, "history"), {
    type: 'reviewed',
    status,
    comment: adminComment,
    actorId: reviewerId,
    actorName: reviewerName,
    createdAt: serverTimestamp(),
  });

  // 通知の送信
  notifyExpenseReview(id, status);
};

/** 審査を取り消して「審査待ち」に戻す */
export const undoReview = async (
  id: string,
  adminComment: string,
  reviewerName: string
) => {
  const reviewerId = getSession("uid");
  if (!reviewerId) throw new Error("ログインが必要です");

  const docRef = doc(db, "expenseApplies", id);
  await updateDoc(docRef, {
    status: 'pending',
    adminComment: adminComment || "審査が取り消されました(審査待ちへ変更)",
    reviewerId: null,
    reviewerName: null,
    reviewedAt: null,
    updatedAt: serverTimestamp(),
  });

  // 履歴に追加
  await addDoc(collection(docRef, "history"), {
    type: 'commented',
    status: 'pending',
    comment: adminComment,
    actorId: reviewerId,
    actorName: reviewerName,
    createdAt: serverTimestamp(),
  });

  // 通知の送信
  notifyExpenseReview(id, "pending");
};
