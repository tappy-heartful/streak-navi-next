import { 
  getEventById, 
  getAssignsByEvent, 
  getAssignMasterData 
} from "@/src/features/assign/api/assign-server-actions";
import { AssignEditClient } from "@/src/features/assign/views/AssignEditClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}): Promise<Metadata> {
  const { eventId } = await searchParams;
  if (!eventId) return { title: "譜割り編集" };

  const event = await getEventById(eventId);
  return {
    title: event?.title ? `${event.title} - 譜割り編集` : "譜割り編集",
  };
}

export default async function AssignEditPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ eventId?: string }>
}) {
  const { eventId } = await searchParams;
  if (!eventId) notFound();

  const [event, assigns, masterData] = await Promise.all([
    getEventById(eventId),
    getAssignsByEvent(eventId),
    getAssignMasterData(),
  ]);

  if (!event) notFound();

  return <AssignEditClient 
    event={event} 
    initialAssigns={assigns} 
    masterData={masterData} 
  />;
}
