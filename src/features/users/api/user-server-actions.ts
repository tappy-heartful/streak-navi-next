import 'server-only';
import admin from "firebase-admin";
import { adminDb } from "@/src/lib/firebase-admin";
import { User, UserLocation, Section, Role, Instrument, SecretWord, Prefecture, Municipality } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * 全ユーザ情報を取得
 */
export async function getUsersServer(): Promise<User[]> {
  const snap = await adminDb.collection("users").get();
  return snap.docs.map(doc => toPlainObject(doc)) as unknown as User[];
}

/**
 * 特定のユーザ情報を取得
 */
export async function getUserServer(uid: string): Promise<User | null> {
  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  return toPlainObject(snap) as unknown as User;
}

/**
 * 全セクション情報を取得（sectionId順）
 */
export async function getSectionsServer(): Promise<Section[]> {
  const snap = await adminDb.collection("sections").orderBy("__name__").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Section[];
}

/**
 * 全役職情報を取得
 */
export async function getRolesServer(): Promise<Role[]> {
  const snap = await adminDb.collection("roles").orderBy("__name__").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[];
}

/**
 * 全楽器情報を取得（sectionId -> id 順）
 */
export async function getInstrumentsServer(): Promise<Instrument[]> {
  const snap = await adminDb.collection("instruments").get();
  const instruments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Instrument[];

  return instruments.sort((a, b) => {
    if (a.sectionId < b.sectionId) return -1;
    if (a.sectionId > b.sectionId) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}

/**
 * 全合言葉（権限一覧）を取得
 */
export async function getSecretWordsServer(): Promise<SecretWord[]> {
  const snap = await adminDb.collection("secretWords").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SecretWord[];
}

/**
 * 全都道府県情報を取得（order順）
 */
export async function getPrefecturesServer(): Promise<Prefecture[]> {
  const snap = await adminDb.collection("prefectures").orderBy("order", "asc").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Prefecture[];
}

/**
 * 特定の都道府県の市区町村一覧を取得
 */
export async function getMunicipalitiesServer(prefectureCode: string): Promise<Municipality[]> {
  const snap = await adminDb.collection("municipalities")
    .where("prefectureCode", "==", prefectureCode)
    .get();
  const datalist = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Municipality[];
  return datalist.sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

/**
 * ユーザの居住地情報（サブコレクション）を取得
 */
export async function getUserLocationServer(uid: string): Promise<UserLocation | null> {
  const snap = await adminDb.collection("users").doc(uid).collection("private").doc("location").get();
  if (!snap.exists) return null;
  return snap.data() as UserLocation;
}

/**
 * 複数の市区町村IDから名前のマップを取得
 */
export async function getMunicipalityNamesMapServer(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  
  const chunks = [];
  for (let i = 0; i < ids.length; i += 30) {
    chunks.push(ids.slice(i, i + 30));
  }
  
  const map: Record<string, string> = {};
  for (const chunk of chunks) {
    const snap = await adminDb.collection("municipalities")
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .get();
    snap.forEach(doc => {
      map[doc.id] = doc.data().name;
    });
  }
  return map;
}
