import { notFound } from "next/navigation";
import { fetchEventConfirmData } from "@/src/features/event/api/event-server-actions";
import { EventConfirmClient } from "@/src/features/event/views/confirm/EventConfirmClient";

export const metadata = { title: "イベント確認" };
export const dynamic = "force-dynamic";

export default async function EventConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId: string }>;
}) {
  const { eventId } = await searchParams;
  if (!eventId) notFound();

  const data = await fetchEventConfirmData(eventId);
  if (!data) notFound();

  return <EventConfirmClient eventId={eventId} data={data} />;
}
