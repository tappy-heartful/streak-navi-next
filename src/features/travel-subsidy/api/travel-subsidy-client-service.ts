import { db } from "@/src/lib/firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { Municipality } from "@/src/lib/firestore/types";

export async function getMunicipalitiesForTravelSubsidy(prefectureId: string): Promise<Municipality[]> {
  const q = query(collection(db, "municipalities"), where("prefectureCode", "==", prefectureId));
  const snap = await getDocs(q);
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Municipality[];
  return list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export async function saveTravelSubsidy(
  data: { prefectureId: string; municipalityId: string; amount: number },
  id?: string,
): Promise<string> {
  const payload = { ...data, updatedAt: serverTimestamp() };
  if (id) {
    await updateDoc(doc(db, "travelSubsidies", id), payload);
    return id;
  }
  const ref = await addDoc(collection(db, "travelSubsidies"), { ...payload, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteTravelSubsidy(id: string): Promise<void> {
  await deleteDoc(doc(db, "travelSubsidies", id));
}
