"use client";

import React from "react";
import Link from "next/link";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { ListGroupContainer } from "@/src/components/Layout/ListGroupContainer";
import { SimpleTable } from "@/src/components/Table/SimpleTable";
import { Board, Section } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";

type Props = {
  boards: Board[];
  sections: Section[];
};

export function BoardListClient({ boards, sections }: Props) {
  const { userData } = useAuth();
  const userSectionId = userData?.sectionId || "";

  const userSection = sections.find((s) => s.id === userSectionId);
  const sectionName = userSection?.name || "セクション";

  const sectionBoards = boards.filter((b) => b.sectionId === userSectionId);
  const allBoards = boards.filter((b) => !b.sectionId);

  const renderContentPreview = (content: string) => {
    const lines = content.split("\n");
    const preview = lines.slice(0, 3).join("\n");
    return lines.length > 3 ? preview + " ..." : preview;
  };

  const columns = [
    { header: "タイトル", key: "title" },
    { header: "内容", key: "content" },
    { header: "作成者", key: "createdByName" },
  ];

  const formatRows = (data: Board[]) =>
    data.map((b) => ({
      ...b,
      title: (
        <Link href={`/board/confirm?boardId=${b.id}`} style={{ fontWeight: "bold" }}>
          {b.title || "無題"}
        </Link>
      ),
      content: (
        <div style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", color: "#666" }}>
          {renderContentPreview(b.content)}
        </div>
      ),
      createdByName: b.createdByName || "匿名",
    }));

  return (
    <ListBaseLayout title="掲示板" icon="fas fa-clipboard-list" basePath="/board" hideAddButton={true}>
      <div className="container">
        {userSectionId && (
          <>
            <ListGroupContainer title={`${sectionName}専用`} icon="fas fa-users">
              <SimpleTable
                headers={["タイトル", "内容", "作成者"]}
                hasData={sectionBoards.length > 0}
                emptyMessage={`${sectionName}向けの投稿はありません🍀`}
              >
                {formatRows(sectionBoards).map((row) => (
                  <tr key={row.id}>
                    <td className="list-table-row-header">{row.title}</td>
                    <td>{row.content}</td>
                    <td className="board-author">{row.createdByName}</td>
                  </tr>
                ))}
              </SimpleTable>
            </ListGroupContainer>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <Link
                href={`/board/edit?mode=new&sectionId=${userSectionId}`}
                className="list-add-button"
                style={{ textDecoration: "none" }}
              >
                ＋ 新規投稿
              </Link>
            </div>
          </>
        )}
      </div>
      <div className="container">
        <ListGroupContainer title="全体向け" icon="fas fa-globe">
          <SimpleTable
            headers={["タイトル", "内容", "作成者"]}
            hasData={allBoards.length > 0}
            emptyMessage="全体向けの投稿はありません🍀"
          >
            {formatRows(allBoards).map((row) => (
              <tr key={row.id}>
                <td className="list-table-row-header">{row.title}</td>
                <td>{row.content}</td>
                <td className="board-author">{row.createdByName}</td>
              </tr>
            ))}
          </SimpleTable>
        </ListGroupContainer>

        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link
            href="/board/edit?mode=new"
            className="list-add-button"
            style={{ textDecoration: "none" }}
          >
            ＋ 全体向けに新規投稿
          </Link>
        </div>
      </div>
    </ListBaseLayout>

  );
}
