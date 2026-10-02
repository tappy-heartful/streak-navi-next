import 'server-only';
import admin from "firebase-admin";
import { adminDb } from "@/src/lib/firebase-admin";
import { User, UserLocation, Section, Role, Instrument, SecretWord, Prefecture, Municipality } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { unstable_cache } from "next/cache";

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
 * 全セクション情報を取得（24時間キャッシュ）
 */
export const getSectionsServer = unstable_cache(
  async (): Promise<Section[]> => {
    const snap = await adminDb.collection("sections").orderBy("__name__").get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Section[];
  },
  ["master-sections"],
  { revalidate: 86400, tags: ["master-sections"] }
);

/**
 * 全役職情報を取得（24時間キャッシュ）
 */
export const getRolesServer = unstable_cache(
  async (): Promise<Role[]> => {
    const snap = await adminDb.collection("roles").orderBy("__name__").get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[];
  },
  ["master-roles"],
  { revalidate: 86400, tags: ["master-roles"] }
);

/**
 * 全楽器情報を取得（24時間キャッシュ）
 */
export const getInstrumentsServer = unstable_cache(
  async (): Promise<Instrument[]> => {
    const snap = await adminDb.collection("instruments").get();
    const instruments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Instrument[];

    return instruments.sort((a, b) => {
      if (a.sectionId < b.sectionId) return -1;
      if (a.sectionId > b.sectionId) return 1;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
  },
  ["master-instruments"],
  { revalidate: 86400, tags: ["master-instruments"] }
);

/**
 * 全合言葉（権限一覧）を取得（24時間キャッシュ）
 */
export const getSecretWordsServer = unstable_cache(
  async (): Promise<SecretWord[]> => {
    const snap = await adminDb.collection("secretWords").get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SecretWord[];
  },
  ["master-secret-words"],
  { revalidate: 86400, tags: ["master-secret-words"] }
);

/**
 * 全都道府県情報を取得（24時間キャッシュ）
 */
export const getPrefecturesServer = unstable_cache(
  async (): Promise<Prefecture[]> => {
    const snap = await adminDb.collection("prefectures").orderBy("order", "asc").get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Prefecture[];
  },
  ["master-prefectures"],
  { revalidate: 86400, tags: ["master-prefectures"] }
);

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
