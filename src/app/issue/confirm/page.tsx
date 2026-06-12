import React from "react";
import { getIssue, getIssueGroups } from "@/src/features/issue/api/issue-server-actions";
import { getUsersServer, getSectionsServer } from "@/src/features/users/api/user-server-actions";
import { notFound } from "next/navigation";
import { IssueConfirmClient } from "@/src/features/issue/views/confirm/IssueConfirmClient";

type Props = {
  searchParams: Promise<{ issueId?: string }>;
};

export const dynamic = "force-dynamic";

export default async function IssueConfirmPage({ searchParams }: Props) {
  const { issueId } = await searchParams;
  if (!issueId) notFound();

  const [issue, users, sections, issueGroups] = await Promise.all([
    getIssue(issueId),
    getUsersServer(),
    getSectionsServer(),
    getIssueGroups(),
  ]);

  if (!issue) notFound();

  return (
    <IssueConfirmClient
      issueData={issue}
      issueId={issueId}
      users={users}
      sections={sections}
      issueGroups={issueGroups}
    />
  );
}
