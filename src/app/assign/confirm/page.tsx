import { 
  getEventById, 
  getAssignsByEvent, 
  getAssignMasterData 
} from "@/src/features/assign/api/assign-server-actions";
import { AssignConfirmClient } from "@/src/features/assign/views/AssignConfirmClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

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
