import { HomePageClient } from "@/src/features/home/components/HomePageClient";
import { getAnnouncementsServer, getScoresServer, getBlueNotesServer, getMediasServer } from "@/src/features/home/api/home-service";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
};

export default async function HomePage() {
  const [
    announcements,
    allScores,
    blueNotes,
    allMedias
  ] = await Promise.all([
    getAnnouncementsServer(),
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