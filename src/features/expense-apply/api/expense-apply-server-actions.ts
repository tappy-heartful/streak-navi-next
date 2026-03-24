import 'server-only';
import { adminDb } from "@/src/lib/firebase-admin";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { ExpenseApply, Prefecture, TravelSubsidy, ExpenseApplyHistory, ExpenseType } from "@/src/lib/firestore/types";

/** 経費種別マスタを取得 */
export async function getExpenseTypesServer(): Promise<ExpenseType[]> {
  const snap = await adminDb.collection("expenseTypes").orderBy("__name__", "asc").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExpenseType[];
}

/** 自分の経費申請一覧を取得 (uidでフィルタ) */
export async function getMyExpenseAppliesServer(uid: string): Promise<ExpenseApply[]> {
  const snap = await adminDb.collection("expenseApplies")
    .where("uid", "==", uid)
    .orderBy("date", "desc")
    .get();
  return snap.docs.map(toPlainObject) as ExpenseApply[];
}

/** 審査対象の全経費申請を取得 (会計メンバー向け) */
export async function getAllExpenseAppliesServer(): Promise<ExpenseApply[]> {
  const snap = await adminDb.collection("expenseApplies")
    .orderBy("date", "desc")
    .get();
  return snap.docs.map(toPlainObject) as ExpenseApply[];
}

/** 特定の経費申請を取得 */
export async function getExpenseApplyServer(id: string): Promise<ExpenseApply | null> {
  const doc = await adminDb.collection("expenseApplies").doc(id).get();
  if (!doc.exists) return null;
  return toPlainObject(doc) as ExpenseApply;
}

/** 旅費補助額を算出 (設定テーブルから) */
export async function calculateTravelSubsidyServer(
  departureMunicipalityId: string,
  arrivalMunicipalityId: string
): Promise<number> {
  // 設定テーブルから補助額を取得
  const snap = await adminDb.collection("travelSubsidies")
    .where("departureMunicipalityId", "==", departureMunicipalityId)
    .where("arrivalMunicipalityId", "==", arrivalMunicipalityId)
    .limit(1)
    .get();
    
  if (snap.empty) return 0;
  return snap.docs[0].data().amount as number;
}

/** 全ての都道府県を取得 */
export async function getPrefecturesServer(): Promise<Prefecture[]> {
  const snap = await adminDb.collection("prefectures").orderBy("order", "asc").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Prefecture[];
}

/** 指定した都道府県の市区町村を取得 */
export async function getMunicipalitiesServer(prefectureId: string) {
  const snap = await adminDb.collection("municipalities")
    .where("prefectureCode", "==", prefectureId)
    .orderBy("name", "asc")
    .get();
  return snap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
}

/** 経費管理の設定 (旅費の候補地点など) を取得 */
export async function getTravelConfigServer() {
  const doc = await adminDb.collection("configs").doc("travel").get();
  if (!doc.exists) return { arrivalPoints: [], departurePoints: [] };
  return doc.data();
}

/** 経費申請の履歴を取得 */
export async function getExpenseHistoryServer(id: string): Promise<ExpenseApplyHistory[]> {
  const snap = await adminDb.collection("expenseApplies").doc(id).collection("history")
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map(toPlainObject) as ExpenseApplyHistory[];
}
