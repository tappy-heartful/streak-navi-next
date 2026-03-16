import { getLivesForTicketServer } from "@/src/features/ticket/api/ticket-server-actions";
import { TicketListClient } from "@/src/features/ticket/views/list/TicketListClient";

type Props = {
  searchParams: Promise<{ liveId?: string }>;
};

export const metadata = { title: "予約者一覧" };

export const dynamic = "force-dynamic";

export default async function TicketListPage({ searchParams }: Props) {
  const { liveId } = await searchParams;
  const lives = await getLivesForTicketServer();
  return <TicketListClient initialLives={lives} initialLiveId={liveId} />;
}
