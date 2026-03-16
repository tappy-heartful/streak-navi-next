import { db } from "@/src/lib/firebase";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { Municipality } from "@/src/lib/firestore/types";

/**
 * ユーザデータの更新
 * @param uid ユーザID
 * @param data 更新データ
 */
export const saveUser = async (uid: string, data: Record<string, unknown>) => {
  const userRef = doc(db, "users", uid);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(userRef, payload);
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
