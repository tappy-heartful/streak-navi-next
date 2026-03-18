import { db } from "@/src/lib/firebase";
import { doc, updateDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { Municipality } from "@/src/lib/firestore/types";

/**
 * ユーザデータの更新
 * prefectureId / municipalityId はサブコレクション users/{uid}/private/location に保存する
 */
export const saveUser = async (uid: string, data: Record<string, unknown>) => {
  const { prefectureId, municipalityId, ...mainData } = data as {
    prefectureId?: string;
    municipalityId?: string;
    [key: string]: unknown;
  };

  // メインドキュメントを更新
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { ...mainData, updatedAt: serverTimestamp() });

  // 居住地情報をサブコレクションに保存（本人のみ書き込み可のセキュリティルール対象）
  const locationRef = doc(db, "users", uid, "private", "location");
  await setDoc(locationRef, { prefectureId: prefectureId ?? "", municipalityId: municipalityId ?? "" }, { merge: true });

  return uid;
};

/**
 * 特定の都道府県の市区町村一覧を取得（クライアントサイド）
 * ※複合インデックス不要のため、クライアントサイドでソートします
 */
export const getMunicipalitiesClient = async (prefectureCode: string): Promise<Municipality[]> => {
  const colRef = collection(db, "municipalities");
  const q = query(
    colRef,
    where("prefectureCode", "==", prefectureCode)
  );
  const snap = await getDocs(q);
  const datalist = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Municipality[];
  
  // クライアント側で名前順にソート
  return datalist.sort((a, b) => a.name.localeCompare(b.name, "ja"));
};
