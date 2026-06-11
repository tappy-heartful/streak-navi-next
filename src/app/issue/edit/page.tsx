import React from "react";
import { getIssue } from "@/src/features/issue/api/issue-server-actions";
import { getUsersServer, getSectionsServer } from "@/src/features/users/api/user-server-actions";
import { IssueEditClient } from "@/src/features/issue/views/edit/IssueEditClient";

type Props = {
  searchParams: Promise<{ mode?: string; issueId?: string }>;
};

export const dynamic = "force-dynamic";

export default async function IssueEditPage({ searchParams }: Props) {
  const { mode, issueId } = await searchParams;
  const isEdit = mode === "edit" || mode === "copy";

  const [initialIssue, users, sections] = await Promise.all([
    isEdit && issueId ? getIssue(issueId) : Promise.resolve(null),
    getUsersServer(),
    getSectionsServer(),
  ]);

  return (
    <IssueEditClient
      mode={(mode as "new" | "edit" | "copy") || "new"}
      issueId={issueId}
      initialIssue={initialIssue}
      users={users}
      sections={sections}
    />
  );
}
