import { notFound } from "next/navigation";
import { fetchEvent, fetchEventEditData } from "@/src/features/event/api/event-server-actions";
import { EventEditClient } from "@/src/features/event/views/edit/EventEditClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; eventId?: string }>;
}): Promise<Metadata> {
  const { mode = "new", eventId } = await searchParams;
  if (mode === "new" || !eventId) {
    return { title: "イベント新規作成" };
  }

  const event = await fetchEvent(eventId);
  return {
    title: event?.title ? `${event.title} - イベント編集` : "イベント編集",
  };
}

export default async function EventEditPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; eventId?: string; type?: string; date?: string }>;
}) {
  const { mode = "new", eventId, type, date } = await searchParams;

  const [initialEvent, editData] = await Promise.all([
    (mode === "edit" || mode === "copy") && eventId ? fetchEvent(eventId) : Promise.resolve(null),
    fetchEventEditData()
  ]);

  if ((mode === "edit" || mode === "copy") && eventId && !initialEvent) {
    notFound();
  }

  const { scores, sections, instruments, prefectures } = editData;

  return (
    <EventEditClient
      mode={mode as "new" | "edit" | "copy"}
      eventId={eventId}
      initialEvent={initialEvent}
      initialType={(type as "schedule" | "attendance") || "attendance"}
      scores={scores}
      sections={sections}
      instruments={instruments}
      prefectures={prefectures}
      initialDate={date}
    />
  );
}
