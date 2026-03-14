import { getBoard } from "@/src/features/board/api/board-server-actions";
import { getSectionsServer } from "@/src/features/users/api/user-server-actions";
import { BoardEditClient } from "@/src/features/board/views/edit/BoardEditClient";

type Props = {
  searchParams: Promise<{ mode?: string; boardId?: string; sectionId?: string }>;
};

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
