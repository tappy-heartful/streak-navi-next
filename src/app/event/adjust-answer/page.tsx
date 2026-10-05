import { notFound } from "next/navigation";
import { fetchAdjustAnswerPageData, fetchEvent } from "@/src/features/event/api/event-server-actions";
import { EventAdjustAnswerClient } from "@/src/features/event/views/adjust-answer/EventAdjustAnswerClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}): Promise<Metadata> {
  const { eventId } = await searchParams;
  if (!eventId) return { title: "日程調整回答" };

  const event = await fetchEvent(eventId);
  return {
    title: event?.title ? `${event.title} - 日程調整回答` : "日程調整回答",
  };
}

export default async function EventAdjustAnswerPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId: string }>;
}) {
  const { eventId } = await searchParams;
  if (!eventId) notFound();

  const data = await fetchAdjustAnswerPageData(eventId);
  if (!data) notFound();

  if (data.event.attendanceType !== "schedule") notFound();

  return <EventAdjustAnswerClient eventId={eventId} event={data.event} adjustStatuses={data.adjustStatuses} />;
}
