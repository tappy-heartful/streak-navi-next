import React from "react";
import { getIssue, getIssueGroups, getIssues } from "@/src/features/issue/api/issue-server-actions";
import { getUsersServer, getSectionsServer } from "@/src/features/users/api/user-server-actions";
import { fetchEvents } from "@/src/features/event/api/event-server-actions";
import { IssueEditClient } from "@/src/features/issue/views/edit/IssueEditClient";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ mode?: string; issueId?: string; parentId?: string; date?: string; type?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { mode = "new", issueId } = await searchParams;
  if (mode === "new" || !issueId) {
    return { title: "TODO新規作成" };
  }

  const issue = await getIssue(issueId);
  return {
    title: issue?.title ? `${issue.title} - TODO編集` : "TODO編集",
  };
}

export default async function IssueEditPage({ searchParams }: Props) {
  const { mode, issueId, parentId, date, type } = await searchParams;
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
      initialDate={date}
      initialType={type}
    />
  );
}
