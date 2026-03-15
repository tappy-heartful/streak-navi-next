import { getAssignEvents } from "@/src/features/assign/api/assign-server-actions";
import { AssignListClient } from "@/src/features/assign/views/AssignListClient";

export default async function AssignListPage() {
  const events = await getAssignEvents();
  
  return <AssignListClient initialEvents={events} />;
}
