import { Live } from "@/src/lib/firestore/types";

export type LiveFilters = {
  search: string;
  sort: string;
};

export const liveFilterFn = (l: Live, f: LiveFilters): boolean => {
  const q = f.search.toLowerCase();
  return (
    l.title?.toLowerCase().includes(q) ||
    l.venue?.toLowerCase().includes(q) ||
    false
  );
};

export const liveSortFn = (a: Live, b: Live, f: LiveFilters): number => {
  const isAsc = f.sort === "date-asc";
  return isAsc
    ? (a.date || "").localeCompare(b.date || "")
    : (b.date || "").localeCompare(a.date || "");
};
