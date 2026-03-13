"use client";

import React from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Board, Section } from "@/src/lib/firestore/types";
import { buildYouTubeHtml } from "@/src/lib/functions";

type Props = {
  boardData: Board;
  boardId: string;
  sections: Section[];
};

export function BoardConfirmClient({ boardData, boardId, sections }: Props) {
  const section = sections.find((s) => s.id === boardData.sectionId);
  const scopeLabel = section ? `${section.name}専用` : "全体向け";

  const renderContent = (content: string) => {
    const lines = content.split("\n");
    const urlRegex = /^(https?:\/\/[^\s]+)$/;

    return lines.map((line, i) => {
      const trimmedLine = line.trim();
      const match = trimmedLine.match(urlRegex);

      if (match) {
        const url = match[1];
        const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

        return (
          <div key={i} style={{ marginBottom: "1rem" }}>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: "break-all" }}>
              {url}
            </a>
            {isYouTube && (
              <div
                style={{ marginTop: "0.5rem" }}
                dangerouslySetInnerHTML={{ __html: buildYouTubeHtml(url) }}
              />
            )}
          </div>
        );
      }
      return (
        <React.Fragment key={i}>
          {line}
          <br />
        </React.Fragment>
      );
    });
  };

  return (
    <BaseLayout>
      <ConfirmLayout
        name="掲示板"
        basePath="/board"
        dataId={boardId}
        featureIdKey="boardId"
        collectionName="boards"
      >
        <DisplayField label="公開範囲">{scopeLabel}</DisplayField>
        <DisplayField label="作成者">{boardData.createdByName || "匿名"}</DisplayField>
        <DisplayField label="タイトル">{boardData.title || "無題"}</DisplayField>
        <DisplayField label="内容">
          <div style={{ lineHeight: "1.6" }}>{renderContent(boardData.content)}</div>
        </DisplayField>

        {boardData.files && boardData.files.length > 0 && (
          <DisplayField label="添付ファイル">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {boardData.files.map((file, idx) => (
                <a
                  key={idx}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px",
                    background: "#f5f5f5",
                    borderRadius: "4px",
                    textDecoration: "none",
                    color: "#333",
                  }}
                >
                  <i className="fas fa-file"></i>
                  <span>{file.name}</span>
                  <i className="fas fa-external-link-alt" style={{ marginLeft: "auto", opacity: 0.5 }}></i>
                </a>
              ))}
            </div>
          </DisplayField>
        )}
      </ConfirmLayout>
    </BaseLayout>
  );
}
