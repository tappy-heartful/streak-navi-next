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

export interface LocationCheckItem {
  prefectureId: string;
  municipalityId: string;
  prefectureName: string;
  municipalityName: string;
}

/** ユーザ登録されている居住地情報のリストを返す */
export async function getUserLocationChecklistServer(): Promise<LocationCheckItem[]> {
  const snap = await adminDb.collectionGroup("private").get();
  
  const rawList = snap.docs
    .filter(d => d.id === "location")
    .map(d => {
      const data = d.data();
      return {
        prefectureId: data.prefectureId as string | undefined,
        municipalityId: data.municipalityId as string | undefined,
      };
    })
    .filter(l => l.prefectureId && l.municipalityId) as { prefectureId: string; municipalityId: string }[];

  // 重複排除
  const uniqueKeys = new Set<string>();
  const uniqueList: { prefectureId: string; municipalityId: string }[] = [];
  rawList.forEach(l => {
    const key = `${l.prefectureId}_${l.municipalityId}`;
    if (!uniqueKeys.has(key)) {
      uniqueKeys.add(key);
      uniqueList.push(l);
    }
  });

  if (uniqueList.length === 0) return [];

  // 名前を取得
  const prefIds = [...new Set(uniqueList.map(l => l.prefectureId))];
  const munIds = [...new Set(uniqueList.map(l => l.municipalityId))];

  const [prefSnap, munSnap] = await Promise.all([
    adminDb.collection("prefectures").where("__name__", "in", prefIds).get(),
    // municipalitiesは30個制限があるので注意が必要だが、一旦このままかチャンク分けが必要
    // ユーザ居住地の種類が30を超える可能性があるならチャンク分けする
    munIds.length > 30 
      ? Promise.resolve({ docs: [] }) // 後で個別取得
      : adminDb.collection("municipalities").where("__name__", "in", munIds).get(),
  ]);

  const prefMap: Record<string, string> = {};
  prefSnap.docs.forEach(d => { prefMap[d.id] = (d.data().name as string) ?? d.id; });

  const munMap: Record<string, string> = {};
  if (munIds.length <= 30) {
    (munSnap as any).docs.forEach((d: any) => { munMap[d.id] = (d.data().name as string) ?? d.id; });
  } else {
    // 30件超える場合はチャンク分け
    const chunks = [];
    for (let i = 0; i < munIds.length; i += 30) {
      chunks.push(munIds.slice(i, i + 30));
    }
    for (const chunk of chunks) {
      const s = await adminDb.collection("municipalities").where("__name__", "in", chunk).get();
      s.docs.forEach(d => { munMap[d.id] = (d.data().name as string) ?? d.id; });
    }
  }

  return uniqueList.map(l => ({
    prefectureId: l.prefectureId,
    municipalityId: l.municipalityId,
    prefectureName: prefMap[l.prefectureId] ?? l.prefectureId,
    municipalityName: munMap[l.municipalityId] ?? l.municipalityId,
  })).sort((a, b) => {
    if (a.prefectureName !== b.prefectureName) return a.prefectureName.localeCompare(b.prefectureName, "ja");
    return a.municipalityName.localeCompare(b.municipalityName, "ja");
  });
}
