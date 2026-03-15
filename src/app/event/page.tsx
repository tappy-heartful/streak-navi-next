import { fetchEvents } from "@/src/features/event/api/event-server-actions";
import { EventListClient } from "@/src/features/event/views/list/EventListClient";

export const metadata = { title: "イベント一覧" };
export const dynamic = "force-dynamic";

export default async function EventListPage() {
  const events = await fetchEvents();
  return <EventListClient events={events} />;
}
