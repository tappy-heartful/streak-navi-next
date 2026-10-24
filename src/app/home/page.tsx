import { HomePageClient } from "@/src/features/home/components/HomePageClient";
import { getHomeFeedDataServer, getScoresServer, getBlueNotesServer, getMediasServer, getHomeBoardsServer } from "@/src/features/home/api/home-service";
import { getSectionsServer } from "@/src/features/users/api/user-server-actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ホーム",
};

// 1分間キャッシュして瞬間的な多重フェッチを防ぐ
export const revalidate = 60;

export default async function HomePage() {
  const [
    feedData,
    allScores,
    blueNotes,
    allMedias,
    boards,
    sections
  ] = await Promise.all([
    getHomeFeedDataServer(),
    getScoresServer(),
    getBlueNotesServer(),
    getMediasServer(10),
    getHomeBoardsServer(10),
    getSectionsServer()
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
        calendarData,
        boards,
        sections
      }} 
    />
  );
}