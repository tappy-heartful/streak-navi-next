"use client";
import { db } from "@/src/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

import { Live, SetlistGroup } from "@/src/lib/firestore/types";

export type LiveFormData = {
  title: string;
  date: string;
  open: string;
  start: string;
  venue: string;
  venueUrl: string;
  venueGoogleMap: string;
  advance: string;
  door: string;
  flyerUrl: string;
  isAcceptReserve: boolean;
  acceptStartDate: string;
  acceptEndDate: string;
  ticketStock: string;
  maxCompanions: string;
  notes: string;
  setlist: SetlistGroup[];
};

export const saveLive = async (
  mode: "new" | "edit" | "copy",
  data: LiveFormData,
  liveId?: string
): Promise<string> => {
  const toNum = (v: string) => {
    if (!v) return undefined;
    const num = Number(v.replace(/,/g, ""));
    return isNaN(num) ? v : num;
  };

  // Filter out empty group titles and empty songs like EventEditClient does
  const setlist = data.setlist
    .filter(g => g.title || g.songIds.some(Boolean))
    .map(g => ({ title: g.title, songIds: g.songIds.filter(Boolean) }));

  const payload = {
    title: data.title,
    date: data.date.replace(/-/g, "."),
    open: data.open || "",
    start: data.start || "",
    venue: data.venue || "",
    venueUrl: data.venueUrl || "",
    venueGoogleMap: data.venueGoogleMap || "",
    advance: toNum(data.advance),
    door: toNum(data.door),
    flyerUrl: data.flyerUrl || "",
    isAcceptReserve: data.isAcceptReserve,
    acceptStartDate: data.acceptStartDate ? data.acceptStartDate.replace(/-/g, ".") : "",
    acceptEndDate: data.acceptEndDate ? data.acceptEndDate.replace(/-/g, ".") : "",
    ticketStock: toNum(data.ticketStock),
    maxCompanions: toNum(data.maxCompanions),
    notes: data.notes || "",
    setlist: setlist,
    updatedAt: serverTimestamp(),
  };
// ... rest of the file

  if (mode === "edit" && liveId) {
    await updateDoc(doc(db, "lives", liveId), payload);
    return liveId;
  } else {
    const ref = await addDoc(collection(db, "lives"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }
};
