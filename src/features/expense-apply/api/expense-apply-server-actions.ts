import 'server-only';
import { adminDb } from "@/src/lib/firebase-admin";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { ExpenseApply, Prefecture, TravelSubsidy, ExpenseApplyHistory, ExpenseType, ExpenseCategory, ExpenseItem } from "@/src/lib/firestore/types";

/** 今日以前のイベント一覧を日付降順で取得 */
export async function getPastEventsServer(): Promise<{ id: string; title: string; date: string }[]> {
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Tokyo" })
    .replace(/\//g, ".");
  const snap = await adminDb.collection("events")
    .where("date", "<=", today)
    .orderBy("date", "desc")
    .get();
  return snap.docs.map(d => ({ id: d.id, title: d.data().title as string, date: d.data().date as string }));
}

/** 経費種別マスタを取得 */
export async function getExpenseTypesServer(): Promise<ExpenseType[]> {
  const snap = await adminDb.collection("expenseTypes").orderBy("__name__", "asc").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExpenseType[];
}

/** 経費区分マスタを取得 */
export async function getExpenseCategoriesServer(): Promise<ExpenseCategory[]> {
  const snap = await adminDb.collection("expenseCategories").orderBy("__name__", "asc").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExpenseCategory[];
}

/** 経費項目マスタを取得 */
export async function getExpenseItemsServer(): Promise<ExpenseItem[]> {
  const snap = await adminDb.collection("expenseItems").orderBy("__name__", "asc").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExpenseItem[];
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
