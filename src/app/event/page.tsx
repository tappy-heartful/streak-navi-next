import { fetchEvents } from "@/src/features/event/api/event-server-actions";
import { EventListClient } from "@/src/features/event/views/list/EventListClient";
import { adminDb } from "@/src/lib/firebase-admin";
import { getMunicipalityNamesMapServer } from "@/src/features/users/api/user-server-actions";

export const metadata = { title: "イベント一覧" };
export const dynamic = "force-dynamic";

export default async function EventListPage() {
  const events = await fetchEvents();

  const prefectureIds = Array.from(new Set(events.map(e => e.prefectureId).filter((id): id is string => !!id)));
  const municipalityIds = Array.from(new Set(events.map(e => e.municipalityId).filter((id): id is string => !!id)));

  const prefNamesMap: Record<string, string> = {};
  if (prefectureIds.length > 0) {
    const prefSnap = await adminDb.collection("prefectures").get();
    prefSnap.forEach(doc => {
      prefNamesMap[doc.id] = doc.data().name || "";
    });
  }

  const munNamesMap = await getMunicipalityNamesMapServer(municipalityIds);

  return (
    <EventListClient
      events={events}
      prefNamesMap={prefNamesMap}
      munNamesMap={munNamesMap}
    />
  );
}
