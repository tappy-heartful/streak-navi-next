import React from "react";
import { getIssue, getIssueGroups, getIssues } from "@/src/features/issue/api/issue-server-actions";
import { getUsersServer, getSectionsServer } from "@/src/features/users/api/user-server-actions";
import { fetchEvents } from "@/src/features/event/api/event-server-actions";
import { IssueEditClient } from "@/src/features/issue/views/edit/IssueEditClient";

type Props = {
  searchParams: Promise<{ mode?: string; issueId?: string; parentId?: string }>;
};

export const dynamic = "force-dynamic";

export default async function IssueEditPage({ searchParams }: Props) {
  const { mode, issueId, parentId } = await searchParams;
  const isEdit = mode === "edit" || mode === "copy";

  const [initialIssue, users, sections, issueGroups, events, issues] = await Promise.all([
    isEdit && issueId ? getIssue(issueId) : Promise.resolve(null),
    getUsersServer(),
    getSectionsServer(),
    getIssueGroups(),
    fetchEvents(),
    getIssues(),
  ]);

  return (
    <IssueEditClient
      mode={(mode as "new" | "edit" | "copy") || "new"}
      issueId={issueId}
      initialIssue={initialIssue}
      users={users}
      sections={sections}
      issueGroups={issueGroups}
      events={events}
      issues={issues}
      parentId={parentId}
    />
  );
}
