import 'server-only';
import { adminDb } from "@/src/lib/firebase-admin";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { TravelSubsidy, Prefecture } from "@/src/lib/firestore/types";

export async function getPrefecturesForTravelSubsidy(): Promise<Prefecture[]> {
  const snap = await adminDb.collection("prefectures").orderBy("order", "asc").get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Prefecture[];
}

export async function getTravelSubsidiesServer(): Promise<TravelSubsidy[]> {
  const snap = await adminDb.collection("travelSubsidies").get();
  return snap.docs.map(toPlainObject) as TravelSubsidy[];
}

/** 補助金設定で使われている市区町村の名前マップを返す */
export async function getMunicipalityNamesMapForSubsidies(
  subsidies: TravelSubsidy[],
): Promise<Record<string, string>> {
  const prefIds = [...new Set(subsidies.map(s => s.prefectureId))];
  if (prefIds.length === 0) return {};

  const map: Record<string, string> = {};
  await Promise.all(
    prefIds.map(async (prefId) => {
      const snap = await adminDb
        .collection("municipalities")
        .where("prefectureCode", "==", prefId)
        .get();
      snap.docs.forEach(d => { map[d.id] = (d.data().name as string) ?? d.id; });
    }),
  );
  return map;
}
