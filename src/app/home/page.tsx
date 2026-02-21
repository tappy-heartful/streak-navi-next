import HomePageClient from "./HomePageClient";
import { getAnnouncementsServer, getScoresServer, getBlueNotesServer, getMediasServer } from "@/src/lib/firestore";
import { cookies } from "next/headers";
import * as utils from "@/src/lib/functions";

export default async function HomePage() {
  // サーバーサイドでのuid取得（Cookie等から取得する場合の例）
  const cookieStore = cookies();
  // const uid = cookieStore.get("uid")?.value || null;
  const uid = utils.getSession("uid");

  const [
    announcements,
    allScores,
    blueNotes,
    allMedias
  ] = await Promise.all([
    getAnnouncementsServer(uid),
    getScoresServer(),
    getBlueNotesServer(),
    getMediasServer(10)
  ]);

  const quickScores = allScores.filter(s => s.isDispTop).slice(0, 4);
  const videoScores = allScores.filter(s => s.isDispTop && !!s.youtubeId);
  const topMedias = allMedias.filter(m => m.isDispTop).slice(0, 4);

  return (
    <HomePageClient 
      initialData={{
        announcements,
        quickScores,
        scores: videoScores,
        blueNotes,
        medias: topMedias
      }} 
    />
  );
}