import { getAssignEvents } from "@/src/features/assign/api/assign-server-actions";
import { AssignListClient } from "@/src/features/assign/views/AssignListClient";

export const metadata = {
  title: "譜割り一覧",
};

export const dynamic = "force-dynamic";

export default async function AssignListPage() {
  const events = await getAssignEvents();
  
  return <AssignListClient initialEvents={events} />;
}
