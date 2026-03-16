import React from "react";
import { getBoards } from "@/src/features/board/api/board-server-actions";
import { getSectionsServer } from "@/src/features/users/api/user-server-actions";
import { BoardListClient } from "@/src/features/board/views/list/BoardListClient";

export const dynamic = "force-dynamic";

export default async function BoardListPage() {
  const [boards, sections] = await Promise.all([
    getBoards(),
    getSectionsServer(),
  ]);

  return <BoardListClient boards={boards} sections={sections} />;
}
