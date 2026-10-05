import React from "react";
import { getBoard } from "@/src/features/board/api/board-server-actions";
import { getSectionsServer } from "@/src/features/users/api/user-server-actions";
import { notFound } from "next/navigation";
import { BoardConfirmClient } from "@/src/features/board/views/confirm/BoardConfirmClient";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ boardId?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { boardId } = await searchParams;
  if (!boardId) return { title: "掲示板詳細" };

  const board = await getBoard(boardId);
  return {
    title: board?.title ? `${board.title} - 掲示板` : "掲示板詳細",
  };
}

export default async function BoardConfirmPage({ searchParams }: Props) {
  const { boardId } = await searchParams;
  if (!boardId) notFound();

  const [board, sections] = await Promise.all([
    getBoard(boardId),
    getSectionsServer(),
  ]);

  if (!board) notFound();

  return <BoardConfirmClient boardData={board} boardId={boardId} sections={sections} />;
}
