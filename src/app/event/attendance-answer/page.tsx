import { notFound } from "next/navigation";
import { fetchAttendanceAnswerPageData, fetchEvent } from "@/src/features/event/api/event-server-actions";
import { EventAttendanceAnswerClient } from "@/src/features/event/views/attendance-answer/EventAttendanceAnswerClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}): Promise<Metadata> {
  const { eventId } = await searchParams;
  if (!eventId) return { title: "出欠回答" };

  const event = await fetchEvent(eventId);
  return {
    title: event?.title ? `${event.title} - 出欠回答` : "出欠回答",
  };
}

export default async function EventAttendanceAnswerPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId: string }>;
}) {
  const { eventId } = await searchParams;
  if (!eventId) notFound();

  const data = await fetchAttendanceAnswerPageData(eventId);
  if (!data) notFound();

  return <EventAttendanceAnswerClient eventId={eventId} event={data.event} attendanceStatuses={data.attendanceStatuses} />;
}
