import { Issue, User } from "@/src/lib/firestore/types";

export type IssueFilters = {
  search: string;
  type: string;
  status: string;
  assigneeId: string;
  sort: string;
};

/**
 * 閲覧権限チェック
 */
export const hasViewPermission = (issue: Issue, currentUser: User | null): boolean => {
  if (!currentUser) return false;
  if (currentUser.isSystemAdmin) return true;
  if (issue.createdBy === currentUser.id) return true;
  if (issue.assigneeId === currentUser.id) return true;
  if (issue.scope === "all") return true;
  if (issue.scope === "part" && issue.partId === currentUser.sectionId) return true;
  if (issue.scope === "user" && issue.allowedUserIds?.includes(currentUser.id)) return true;
  return false;
};

/**
 * フィルタ知能
 */
export const issueFilterFn = (
  issue: Issue,
  f: IssueFilters,
  currentUser: User | null
): boolean => {
  // 1. 閲覧権限チェック
  if (!hasViewPermission(issue, currentUser)) {
    return false;
  }

  // 2. キーワード検索
  const matchSearch =
    !f.search ||
    issue.title?.toLowerCase().includes(f.search.toLowerCase()) ||
    issue.description?.toLowerCase().includes(f.search.toLowerCase());

  // 3. 区分
  const matchType = !f.type || issue.type === f.type;

  // 4. ステータス
  let matchStatus = true;
  if (f.status === "open") {
    matchStatus = issue.status !== "completed";
  } else if (f.status) {
    matchStatus = issue.status === f.status;
  }

  // 5. 担当者
  const matchAssignee = !f.assigneeId || issue.assigneeId === f.assigneeId;

  return !!(matchSearch && matchType && matchStatus && matchAssignee);
};

/**
 * ソート知能
 */
export const issueSortFn = (a: Issue, b: Issue, f: IssueFilters): number => {
  const [key, order] = f.sort.split("-");
  const isAsc = order === "asc";

  if (key === "date") {
    const dateA = a.date || "9999.12.31"; // 日付未設定は一番後ろ
    const dateB = b.date || "9999.12.31";
    return isAsc
      ? dateA.localeCompare(dateB)
      : dateB.localeCompare(dateA);
  }

  // デフォルト: 新着順 (createdAt-desc)
  return isAsc
    ? (a.createdAt || 0) - (b.createdAt || 0)
    : (b.createdAt || 0) - (a.createdAt || 0);
};
