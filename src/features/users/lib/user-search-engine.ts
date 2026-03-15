import { User } from "@/src/lib/firestore/types";

export type UserFilters = {
  search: string;
  sectionId: string;
  sort: string;
};

export const userFilterFn = (user: User, filters: UserFilters): boolean => {
  // 1. セクション絞り込み
  if (filters.sectionId && user.sectionId !== filters.sectionId) {
    return false;
  }

  // 2. 文字列検索（氏名、略称など）
  if (filters.search) {
    const q = filters.search.toLowerCase();
    const nameMatch = user.displayName?.toLowerCase().includes(q);
    const abbrMatch = user.abbreviation?.toLowerCase().includes(q);
    
    if (!nameMatch && !abbrMatch) {
      return false;
    }
  }

  return true;
};

export const userSortFn = (a: User, b: User, filters: UserFilters): number => {
  switch (filters.sort) {
    case "section-role": {
      // 1. セクション昇順
      const secA = a.sectionId || "zzzz";
      const secB = b.sectionId || "zzzz";
      if (secA < secB) return -1;
      if (secA > secB) return 1;

      // 2. 役職昇順
      const roleA = a.roleId || "zzzz";
      const roleB = b.roleId || "zzzz";
      if (roleA < roleB) return -1;
      if (roleA > roleB) return 1;

      return 0;
    }
    case "createdAt-desc":
      return (b.createdAt || 0) - (a.createdAt || 0);
    case "lastLoginAt-desc":
      return (b.lastLoginAt || 0) - (a.lastLoginAt || 0);
    default:
      return 0;
  }
};
