import { notFound } from "next/navigation";
import { fetchEventConfirmData, fetchEvent } from "@/src/features/event/api/event-server-actions";
import { EventConfirmClient } from "@/src/features/event/views/confirm/EventConfirmClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}): Promise<Metadata> {
  const { eventId } = await searchParams;
  if (!eventId) return { title: "イベント詳細" };

  const event = await fetchEvent(eventId);
  return {
    title: event?.title ? `${event.title} - イベント詳細` : "イベント詳細",
  };
}

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
