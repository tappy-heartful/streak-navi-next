"use client";

import { db } from "@/src/lib/firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { getSession } from "@/src/lib/functions";
import { ExpenseApplyFormData, ExpenseType, ExpenseCategory, ExpenseItem } from "@/src/lib/firestore/types";

/** 都道府県IDから市区町村一覧を取得 (Client SDK) */
export const getMunicipalitiesClient = async (prefectureCode: string) => {
  const q = query(
    collection(db, "municipalities"),
    where("prefectureCode", "==", prefectureCode)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
};

/** 旅費の補助額計算 (ロジックは仮) */
export const calculateTravelSubsidyClient = async (
  fromPref: string, 
  fromMun: string, 
  toPref: string, 
  toMun: string
) => {
  // 本来はマスタ(travelSubsidies)を参照するが、一旦0で返す
  return 0;
};

/** 経費種別一覧を取得 */
export const getExpenseTypesClient = async (): Promise<ExpenseType[]> => {
  const snap = await getDocs(collection(db, "expenseTypes"));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExpenseType[];
};

/** 経費区分一覧を取得 */
export const getExpenseCategoriesClient = async (): Promise<ExpenseCategory[]> => {
  const snap = await getDocs(collection(db, "expenseCategories"));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExpenseCategory[];
};

/** 経費項目一覧を取得 */
export const getExpenseItemsClient = async (): Promise<ExpenseItem[]> => {
  const snap = await getDocs(collection(db, "expenseItems"));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExpenseItem[];
};

/** 経費申請の保存 (新規作成・更新・コピー) */
export const saveExpenseApply = async (
  mode: "new" | "edit" | "copy",
  data: ExpenseApplyFormData,
  actorName: string,
  id?: string
): Promise<string> => {
  const uid = getSession("uid");
  if (!uid) throw new Error("ログインが必要です");

  const payload = {
    ...data,
    status: "pending",
    updatedAt: serverTimestamp(),
  };

  if (mode === "edit" && id) {
    const docRef = doc(db, "expenseApplies", id);
    await updateDoc(docRef, payload);
    
    // 履歴に追加
    await addDoc(collection(docRef, "history"), {
      type: 'updated',
      status: 'pending',
      actorId: uid,
      actorName,
      createdAt: serverTimestamp(),
    });

    return id;
  } else {
    const res = await addDoc(collection(db, "expenseApplies"), {
      ...payload,
      uid,
      status: "pending", // 初期ステータス
      createdAt: serverTimestamp(),
    });

    const docRef = doc(db, "expenseApplies", res.id);
    // 履歴に追加
    await addDoc(collection(docRef, "history"), {
      type: 'created',
      status: 'pending',
      actorId: uid,
      actorName,
      createdAt: serverTimestamp(),
    });

    return res.id;
  }
};

/** 経費申請の削除 */
export const deleteExpenseApply = async (id: string) => {
  await deleteDoc(doc(db, "expenseApplies", id));
};

/** 旅費設定を取得 */
export const getTravelConfigClient = async () => {
  const s = await getDoc(doc(db, "configs", "travel"));
  return s.exists() ? s.data() as { arrivalPoints: any[], departurePoints: any[] } : { arrivalPoints: [], departurePoints: [] };
};

/** ユーザの現在地情報を取得 */
export const getUserLocationClient = async (uid: string) => {
  const s = await getDoc(doc(db, "users", uid, "private", "location"));
  return s.exists() ? s.data() as { prefectureId: string, municipalityId: string } : null;
};
