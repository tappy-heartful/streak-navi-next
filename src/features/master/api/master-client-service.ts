import { db } from "@/src/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Instrument, Section, Role, Genre, InstrumentPart, DefaultInstrumentConfigDoc } from "@/src/lib/firestore/types";
import { DEFAULT_SECTIONS, DEFAULT_INSTRUMENTS, DEFAULT_INSTRUMENT_CONFIG } from "@/src/lib/firestore/master-defaults";

// ==========================================
// 楽器 (Instrument)
// ==========================================
export async function saveInstrument(inst: Instrument): Promise<void> {
  const ref = doc(db, "instruments", inst.id);
  await setDoc(
    ref,
    {
      name: inst.name,
      sectionId: inst.sectionId,
      order: Number(inst.order) || 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteInstrument(id: string): Promise<void> {
  await deleteDoc(doc(db, "instruments", id));
}

export async function getClientInstruments(): Promise<Instrument[]> {
  const snap = await getDocs(collection(db, "instruments"));
  if (snap.empty) return [...DEFAULT_INSTRUMENTS];
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Instrument[];
  list.sort((a, b) => {
    if (a.sectionId !== b.sectionId) return a.sectionId.localeCompare(b.sectionId);
    return (Number(a.order) || 999) - (Number(b.order) || 999);
  });
  return list;
}

// ==========================================
// デフォルト楽器構成 (Default Instrument Config)
// ==========================================
export async function saveDefaultInstrumentConfig(
  config: Record<string, InstrumentPart[]>,
  userDisplayName?: string
): Promise<void> {
  const ref = doc(db, "masters", "defaultInstrumentConfig");
  await setDoc(
    ref,
    {
      config,
      updatedAt: serverTimestamp(),
      updatedBy: userDisplayName || "Admin",
    },
    { merge: true }
  );
}

export async function getClientDefaultInstrumentConfig(): Promise<Record<string, InstrumentPart[]>> {
  const ref = doc(db, "masters", "defaultInstrumentConfig");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as DefaultInstrumentConfigDoc;
    if (data?.config && Object.keys(data.config).length > 0) {
      return data.config;
    }
  }
  return DEFAULT_INSTRUMENT_CONFIG;
}

// ==========================================
// パート・セクション (Section)
// ==========================================
export async function saveSection(sec: Section): Promise<void> {
  const ref = doc(db, "sections", sec.id);
  await setDoc(
    ref,
    {
      name: sec.name,
      order: Number(sec.order) || 0,
      color: sec.color || "#0284c7",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteSection(id: string): Promise<void> {
  await deleteDoc(doc(db, "sections", id));
}

export async function getClientSections(): Promise<Section[]> {
  const snap = await getDocs(collection(db, "sections"));
  if (snap.empty) return [...DEFAULT_SECTIONS];
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Section[];
  list.sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
  return list;
}

// ==========================================
// 役職 (Role)
// ==========================================
export async function saveRole(role: Role): Promise<void> {
  const ref = doc(db, "roles", role.id);
  await setDoc(
    ref,
    {
      name: role.name,
      order: Number(role.order) || 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteRole(id: string): Promise<void> {
  await deleteDoc(doc(db, "roles", id));
}

export async function getClientRoles(): Promise<Role[]> {
  const snap = await getDocs(collection(db, "roles"));
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Role[];
  list.sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
  return list;
}

// ==========================================
// ジャンル (Genre)
// ==========================================
export async function saveGenre(genre: Genre): Promise<void> {
  const ref = doc(db, "genres", genre.id);
  await setDoc(
    ref,
    {
      name: genre.name,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteGenre(id: string): Promise<void> {
  await deleteDoc(doc(db, "genres", id));
}

export async function getClientGenres(): Promise<Genre[]> {
  const snap = await getDocs(collection(db, "genres"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Genre[];
}

