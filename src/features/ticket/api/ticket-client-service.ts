"use client";
import { db } from "@/src/lib/firebase";
import { archiveAndDeleteDoc } from "@/src/lib/functions";
import {
  collection, getDocs, query, where, orderBy,
  addDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { Ticket, LiveCheckIn } from "@/src/lib/firestore/types";

export async function fetchTickets(liveId: string): Promise<Ticket[]> {
  const snap = await getDocs(
    query(collection(db, "tickets"), where("liveId", "==", liveId), orderBy("reservationNo", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
}

export async function fetchCheckIns(liveId: string): Promise<LiveCheckIn[]> {
  const snap = await getDocs(
    query(collection(db, "checkIns"), where("liveId", "==", liveId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LiveCheckIn));
}

export async function fetchCheckInsByTicketId(ticketId: string): Promise<LiveCheckIn[]> {
  const snap = await getDocs(
    query(collection(db, "checkIns"), where("ticketId", "==", ticketId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LiveCheckIn));
}

export async function addCheckIn(data: {
  ticketId: string;
  reservationNo: string;
  liveId: string;
  name: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "checkIns"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteCheckIn(checkInId: string): Promise<void> {
  await deleteDoc(doc(db, "checkIns", checkInId));
}

export async function addDoorCheckIn(data: {
  reservationNo: string;
  liveId: string;
  count: number;
}): Promise<void> {
  const promises = Array.from({ length: data.count }, () =>
    addDoc(collection(db, "checkIns"), {
      ticketId: null,
      reservationNo: data.reservationNo,
      liveId: data.liveId,
      name: "当日受付のお客様",
      type: "door",
      createdAt: serverTimestamp(),
    })
  );
  await Promise.all(promises);
}

export async function deleteDoorCheckIn(checkInId: string): Promise<void> {
  await archiveAndDeleteDoc("checkIns", checkInId);
}
