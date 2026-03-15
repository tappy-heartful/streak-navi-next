import { notFound } from "next/navigation";
import { fetchAdjustAnswerPageData } from "@/src/features/event/api/event-server-actions";
import { EventAdjustAnswerClient } from "@/src/features/event/views/adjust-answer/EventAdjustAnswerClient";

export const metadata = { title: "日程調整回答" };
export const dynamic = "force-dynamic";

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
