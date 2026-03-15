import { notFound } from "next/navigation";
import { fetchEvent, fetchEventEditData } from "@/src/features/event/api/event-server-actions";
import { EventEditClient } from "@/src/features/event/views/edit/EventEditClient";

export const metadata = { title: "イベント管理" };
export const dynamic = "force-dynamic";

export default async function EventEditPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; eventId?: string; type?: string }>;
}) {
  const { mode = "new", eventId, type } = await searchParams;

  const [initialEvent, editData] = await Promise.all([
    (mode === "edit" || mode === "copy") && eventId ? fetchEvent(eventId) : Promise.resolve(null),
    fetchEventEditData()
  ]);

  if ((mode === "edit" || mode === "copy") && eventId && !initialEvent) {
    notFound();
  }

  const { scores, sections, instruments } = editData;

  return (
    <EventEditClient
      mode={mode as "new" | "edit" | "copy"}
      eventId={eventId}
      initialEvent={initialEvent}
      initialType={(type as "schedule" | "attendance") || "attendance"}
      scores={scores}
      sections={sections}
      instruments={instruments}
    />
  );
}
