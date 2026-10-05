import { getBoard } from "@/src/features/board/api/board-server-actions";
import { getSectionsServer } from "@/src/features/users/api/user-server-actions";
import { BoardEditClient } from "@/src/features/board/views/edit/BoardEditClient";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ mode?: string; boardId?: string; sectionId?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { mode = "new", boardId } = await searchParams;
  if (mode === "new" || !boardId) {
    return { title: "掲示板新規投稿" };
  }

  const board = await getBoard(boardId);
  return {
    title: board?.title ? `${board.title} - 掲示板編集` : "掲示板編集",
  };
}

export default async function BoardEditPage({ searchParams }: Props) {
  const { mode, boardId, sectionId } = await searchParams;
  const isEdit = mode === "edit" || mode === "copy";

  const [initialBoard, sections] = await Promise.all([
    isEdit && boardId ? getBoard(boardId) : Promise.resolve(null),
    getSectionsServer(),
  ]);

  return (
    <BoardEditClient
      mode={(mode as "new" | "edit" | "copy") || "new"}
      boardId={boardId}
      initialBoard={initialBoard}
      sections={sections}
      userSectionId={sectionId}
    />
  );
}
