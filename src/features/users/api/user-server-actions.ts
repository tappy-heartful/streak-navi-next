import 'server-only';
import { adminDb } from "@/src/lib/firebase-admin";
import { User, Section, Role, Instrument, SecretWord } from "@/src/lib/firestore/types";
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
  // adminDbでは複合インデックスがないとorderByを複数指定できない場合があるため、
  // クライアント側と同じように取得後にソートするか、シンプルに取得します
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
