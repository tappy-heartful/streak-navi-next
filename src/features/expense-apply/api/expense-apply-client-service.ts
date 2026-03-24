import { db } from "@/src/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, deleteDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { ExpenseApply, Municipality, ExpenseType, ExpenseCategory, ExpenseItem } from "@/src/lib/firestore/types";
import { getSession } from "@/src/lib/functions";

/** すべての経費種別を取得 */
export async function getExpenseTypesClient(): Promise<ExpenseType[]> {
  const q = query(collection(db, "expenseTypes"), orderBy("__name__", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseType));
}

/** すべての経費区分を取得 */
export async function getExpenseCategoriesClient(): Promise<ExpenseCategory[]> {
  const q = query(collection(db, "expenseCategories"), orderBy("__name__", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseCategory));
}

/** すべての経費項目を取得 */
export async function getExpenseItemsClient(): Promise<ExpenseItem[]> {
  const q = query(collection(db, "expenseItems"), orderBy("__name__", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseItem));
}

export type ExpenseApplyFormData = Omit<ExpenseApply, 'id' | 'uid' | 'createdAt' | 'updatedAt'>;

/** 都道府県IDから市区町村リストを取得 (Client用) */
export async function getMunicipalitiesClient(prefectureId: string): Promise<{ id: string; name: string }[]> {
  const q = query(
    collection(db, "municipalities"),
    where("prefectureCode", "==", prefectureId),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, name: (doc.data() as any).name }));
}

/** 旅費補助額を算出 (Client用) */
export async function calculateTravelSubsidyClient(
  departureMunicipalityId: string,
  arrivalMunicipalityId: string
): Promise<number> {
  const q = query(
    collection(db, "travelSubsidies"),
    where("departureMunicipalityId", "==", departureMunicipalityId),
    where("arrivalMunicipalityId", "==", arrivalMunicipalityId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return 0;
  return snap.docs[0].data().amount as number;
}

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
    const docRef = await addDoc(collection(db, "expenseApplies"), {
      ...payload,
      uid,
      status: "pending", // 初期ステータス
      createdAt: serverTimestamp(),
    });

    // 履歴に追加
    await addDoc(collection(docRef, "history"), {
      type: 'created',
      status: 'pending',
      actorId: uid,
      actorName,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  }
};

/** 経費申請の削除 */
export const deleteExpenseApply = async (id: string) => {
  await deleteDoc(doc(db, "expenseApplies", id));
};

