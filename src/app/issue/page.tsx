import React from "react";
import { getIssues } from "@/src/features/issue/api/issue-server-actions";
import { getUsersServer, getSectionsServer } from "@/src/features/users/api/user-server-actions";
import { IssueListClient } from "@/src/features/issue/views/list/IssueListClient";

export const dynamic = "force-dynamic";

export default async function IssueListPage() {
  const [issues, users, sections] = await Promise.all([
    getIssues(),
    getUsersServer(),
    getSectionsServer(),
  ]);

  return <IssueListClient initialData={{ issues, users, sections }} />;
}
