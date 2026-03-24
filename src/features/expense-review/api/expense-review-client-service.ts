import { db } from "@/src/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getSession } from "@/src/lib/functions";

/** 審査結果の反映 (経理メンバーのみが実行可能) */
export const judgeExpenseApply = async (
  id: string,
  status: 'approved' | 'rejected',
  adminComment: string,
  reviewerName: string
) => {
  const reviewerId = getSession("uid");
  if (!reviewerId) throw new Error("ログインが必要です");

  const docRef = doc(db, "expenseApplies", id);
  await updateDoc(docRef, {
    status,
    adminComment: adminComment || "", // コレクション側のフィールド名
    reviewerId,
    reviewerName,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};
