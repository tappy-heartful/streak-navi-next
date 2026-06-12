import { getIssues, getIssueGroups } from "@/src/features/issue/api/issue-server-actions";
import { getUsersServer, getSectionsServer } from "@/src/features/users/api/user-server-actions";
import { IssueListClient } from "@/src/features/issue/views/list/IssueListClient";

export const dynamic = "force-dynamic";

export default async function IssueListPage() {
  const [issues, users, sections, issueGroups] = await Promise.all([
    getIssues(),
    getUsersServer(),
    getSectionsServer(),
    getIssueGroups(),
  ]);

  return <IssueListClient initialData={{ issues, users, sections, issueGroups }} />;
}
