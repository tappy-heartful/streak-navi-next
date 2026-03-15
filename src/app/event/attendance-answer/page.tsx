import { notFound } from "next/navigation";
import { fetchAttendanceAnswerPageData } from "@/src/features/event/api/event-server-actions";
import { EventAttendanceAnswerClient } from "@/src/features/event/views/attendance-answer/EventAttendanceAnswerClient";

export const metadata = { title: "出欠回答" };
export const dynamic = "force-dynamic";

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
