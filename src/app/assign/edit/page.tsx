import { 
  getEventById, 
  getAssignsByEvent, 
  getAssignMasterData 
} from "@/src/features/assign/api/assign-server-actions";
import { AssignEditClient } from "@/src/features/assign/views/AssignEditClient";
import { notFound } from "next/navigation";

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
