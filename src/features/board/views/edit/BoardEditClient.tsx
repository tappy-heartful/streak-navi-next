"use client";

import React, { useState } from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { AppInput } from "@/src/components/Form/AppInput";
import { FormField } from "@/src/components/Form/FormField";
import { useAppForm } from "@/src/hooks/useAppForm";
import { rules } from "@/src/lib/validation";
import { Board, Section } from "@/src/lib/firestore/types";
import { saveBoard } from "@/src/features/board/api/board-client-service";
import { storage } from "@/src/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";

type Props = {
  mode: "new" | "edit" | "copy";
  boardId?: string;
  initialBoard: Board | null;
  sections: Section[];
  userSectionId?: string;
};

export function BoardEditClient({ mode, boardId, initialBoard, sections, userSectionId }: Props) {
  const [files, setFiles] = useState<{ name: string; url: string; path: string }[]>(
    initialBoard?.files || []
  );

  const form = useAppForm(
    {
      title: (mode === "copy" ? `${initialBoard?.title}（コピー）` : initialBoard?.title) ?? "",
      content: initialBoard?.content ?? "",
      sectionId: (mode === "new" ? (userSectionId || null) : initialBoard?.sectionId) ?? null,
    },
    {
      title: [rules.required],
      content: [rules.required],
    }
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    showSpinner();
    try {
      const newFiles = [...files];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileName = file.name;
        const path = `boards/attachments/${Date.now()}_${fileName}`;
        const storageRef = ref(storage, path);
        
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newFiles.push({ name: fileName, url, path });
      }
      setFiles(newFiles);
    } catch (err) {
      console.error(err);
      showDialog("アップロードに失敗しました");
    } finally {
      hideSpinner();
      e.target.value = "";
    }
  };

  const removeFile = async (index: number) => {
    const file = files[index];
    const confirmed = await showDialog(`「${file.name}」を削除しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      const storageRef = ref(storage, file.path);
      await deleteObject(storageRef);
      const newFiles = [...files];
      newFiles.splice(index, 1);
      setFiles(newFiles);
    } catch (err) {
      console.error(err);
      showDialog("ファイルの削除に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const inputProps = (field: keyof typeof form.formData) => ({
    field,
    value: form.formData[field],
    error: form.errors[field],
    updateField: form.updateField,
  });

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="掲示板"
        featureIdKey="boardId"
        basePath="/board"
        dataId={boardId}
        mode={mode}
        form={form}
        onSaveApi={(data) => saveBoard(mode, { ...data, files }, boardId)}
      >
        <FormField label="公開範囲" error={form.errors.sectionId}>
          <select
            className="form-control"
            value={form.formData.sectionId || "all"}
            onChange={(e) => form.updateField("sectionId", e.target.value === "all" ? null : e.target.value)}
          >
            <option value="all">全体向け</option>
            {sections
              .filter((s) => !userSectionId || s.id === userSectionId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}専用
                </option>
              ))}

          </select>
        </FormField>

        <AppInput label="タイトル" required {...inputProps("title")} />
        
        <FormField label="内容" required error={form.errors.content}>
          <textarea
            className="form-control"
            rows={10}
            value={form.formData.content}
            onChange={(e) => form.updateField("content", e.target.value)}
            placeholder="内容を入力してください"
          ></textarea>
        </FormField>

        <FormField label="添付ファイル">
          <div style={{ marginBottom: "1rem" }}>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="board-file-input"
            />
            <button
              type="button"
              className="add-room-button"
              onClick={() => document.getElementById("board-file-input")?.click()}
            >
              <i className="fas fa-plus"></i> ファイルを追加
            </button>
          </div>
          
          {files.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {files.map((file, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px",
                    background: "#f9f9f9",
                    borderRadius: "4px",
                    marginBottom: "4px",
                  }}
                >
                  <i className="far fa-file"></i>
                  <span style={{ flex: 1, fontSize: "0.9rem" }}>{file.name}</span>
                  <button
                    type="button"
                    className="remove-room-button"
                    onClick={() => removeFile(i)}
                    style={{ padding: "4px 8px" }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FormField>
      </EditFormLayout>
    </BaseLayout>
  );
}
