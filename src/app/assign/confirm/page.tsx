import { 
  getEventById, 
  getAssignsByEvent, 
  getAssignMasterData 
} from "@/src/features/assign/api/assign-server-actions";
import { AssignConfirmClient } from "@/src/features/assign/views/AssignConfirmClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}): Promise<Metadata> {
  const { eventId } = await searchParams;
  if (!eventId) return { title: "譜割り詳細" };

  const event = await getEventById(eventId);
  return {
    title: event?.title ? `${event.title} - 譜割り詳細` : "譜割り詳細",
  };
}

export default async function AssignConfirmPage({ 
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

  return <AssignConfirmClient 
    event={event} 
    assigns={assigns} 
    masterData={masterData} 
  />;
}
