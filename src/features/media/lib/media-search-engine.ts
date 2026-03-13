import { Media } from "@/src/lib/firestore/types";

export type MediaFilters = {
  search: string;
  sort: string;
};

export const mediaFilterFn = (m: Media, f: MediaFilters): boolean => {
  return m.title?.toLowerCase().includes(f.search.toLowerCase()) ?? true;
};

export const mediaSortFn = (a: Media, b: Media, f: MediaFilters): number => {
  const isAsc = f.sort === "date-asc";
  return isAsc
    ? (a.date || "").localeCompare(b.date || "")
    : (b.date || "").localeCompare(a.date || "");
};
