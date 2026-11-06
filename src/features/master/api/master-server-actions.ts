import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";
import { Instrument, Section, Role, Genre, InstrumentPart, DefaultInstrumentConfigDoc } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { DEFAULT_SECTIONS, DEFAULT_INSTRUMENTS, DEFAULT_INSTRUMENT_CONFIG } from "@/src/lib/firestore/master-defaults";

export interface MasterPageData {
  instruments: Instrument[];
  sections: Section[];
  roles: Role[];
  genres: Genre[];
  defaultInstrumentConfig: Record<string, InstrumentPart[]>;
}

/**
 * サーバー側で全マスタデータを取得
 */
export async function fetchMasterDataServer(): Promise<MasterPageData> {
  const [instSnap, secSnap, roleSnap, genreSnap, defConfigDoc] = await Promise.all([
    adminDb.collection("instruments").get(),
    adminDb.collection("sections").get(),
    adminDb.collection("roles").get(),
    adminDb.collection("genres").get(),
    adminDb.collection("masters").doc("defaultInstrumentConfig").get(),
  ]);

  // 1. instruments
  let instruments: Instrument[] = [];
  if (!instSnap.empty) {
    instruments = instSnap.docs.map(toPlainObject) as Instrument[];
  } else {
    instruments = [...DEFAULT_INSTRUMENTS];
  }
  instruments.sort((a, b) => {
    if (a.sectionId !== b.sectionId) {
      return a.sectionId.localeCompare(b.sectionId);
    }
    return (Number(a.order) || 999) - (Number(b.order) || 999);
  });

  // 2. sections
  let sections: Section[] = [];
  if (!secSnap.empty) {
    sections = secSnap.docs.map(toPlainObject) as Section[];
  } else {
    sections = [...DEFAULT_SECTIONS];
  }
  sections.sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));

  // 3. roles
  const roles: Role[] = roleSnap.docs.map(toPlainObject) as Role[];
  roles.sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));

  // 4. genres
  const genres: Genre[] = genreSnap.docs.map(toPlainObject) as Genre[];

  // 5. defaultInstrumentConfig
  let defaultInstrumentConfig: Record<string, InstrumentPart[]> = DEFAULT_INSTRUMENT_CONFIG;
  if (defConfigDoc.exists) {
    const data = toPlainObject(defConfigDoc) as DefaultInstrumentConfigDoc;
    if (data?.config && Object.keys(data.config).length > 0) {
      defaultInstrumentConfig = data.config;
    }
  }

  return {
    instruments,
    sections,
    roles,
    genres,
    defaultInstrumentConfig,
  };
}

/**
 * 譜面作成用のデフォルト楽器構成を取得
 */
export async function getDefaultInstrumentConfigServer(): Promise<Record<string, InstrumentPart[]>> {
  try {
    const doc = await adminDb.collection("masters").doc("defaultInstrumentConfig").get();
    if (doc.exists) {
      const data = toPlainObject(doc) as DefaultInstrumentConfigDoc;
      if (data?.config && Object.keys(data.config).length > 0) {
        return data.config;
      }
    }
  } catch (err) {
    console.error("Failed to get defaultInstrumentConfig:", err);
  }
  return DEFAULT_INSTRUMENT_CONFIG;
}

