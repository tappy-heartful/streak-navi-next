import { HomePageClient } from "@/src/features/home/components/HomePageClient";
import { getHomeFeedDataServer, getScoresServer, getBlueNotesServer, getMediasServer } from "@/src/features/home/api/home-service";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
};

// 1分間キャッシュして瞬間的な多重フェッチを防ぐ
export const revalidate = 60;

export default async function HomePage() {
  const [
    feedData,
    allScores,
    blueNotes,
    allMedias
  ] = await Promise.all([
    getHomeFeedDataServer(),
    getScoresServer(),
    getBlueNotesServer(),
    getMediasServer(10),
  ]);

  const { announcements, calendarData } = feedData;
  const quickScores = allScores.filter(s => s.isDispTop).slice(0, 6);
  const videoScores = allScores.filter(s => s.isDispTop && !!s.youtubeId);
  const topMedias = allMedias.filter(m => m.isDispTop).slice(0, 4);

  return (
    <HomePageClient 
      initialData={{
        announcements,
        quickScores,
        scores: videoScores,
        blueNotes,
        medias: topMedias,
        calendarData
      }} 
    />
  );
}