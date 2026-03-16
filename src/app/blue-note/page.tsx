import { getBlueNotesServer } from "@/src/features/blue-note/api/blue-note-server-actions";
import { BlueNoteClient } from "@/src/features/blue-note/views/BlueNoteClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "今日の一曲 | Swing Streak Jazz Orchestra",
};

export const dynamic = "force-dynamic";

export default async function BlueNotePage() {
  const blueNotes = await getBlueNotesServer();
  return <BlueNoteClient initialBlueNotes={blueNotes} />;
}
