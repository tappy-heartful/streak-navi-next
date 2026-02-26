import { Score } from "@/src/lib/firestore/types";

export type ScoreFilters = {
  search: string;
  genre: string;
  eventId: string;
  sort: string;
};

// フィルタ知能
export const scoreFilterFn = (s: Score, f: ScoreFilters, events: any[]) => {
  const matchTitle = s.title?.toLowerCase().includes(f.search.toLowerCase());
  const matchGenre = !f.genre || s.genres?.includes(f.genre);
  let matchEvent = true;
  if (f.eventId) {
    const event = events.find((e: any) => e.id === f.eventId);
    matchEvent = event?.scoreIdsInSetlist?.includes(s.id);
  }
  return !!(matchTitle && matchGenre && matchEvent);
};

// ソート知能
export const scoreSortFn = (a: Score, b: Score, f: ScoreFilters, events: any[]) => {
  if (f.eventId) {
    const event = events.find((e: any) => e.id === f.eventId);
    const orderedIds = event?.scoreIdsInSetlist || [];
    return orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id);
  }
  const [key, order] = f.sort.split("-");
  const isAsc = order === "asc";
  if (key === "title") {
    return isAsc 
      ? (a.title || "").localeCompare(b.title || "", "ja") 
      : (b.title || "").localeCompare(a.title || "", "ja");
  }
  return isAsc ? (a.createdAt || 0) - (b.createdAt || 0) : (b.createdAt || 0) - (a.createdAt || 0);
};