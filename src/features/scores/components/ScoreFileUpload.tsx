"use client";

import React, { useRef, useState } from "react";
import { ScoreFile } from "@/src/lib/firestore/types";
import { storage } from "@/src/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";
import styles from "./ScoreFileUpload.module.css";

interface ScoreFileUploadProps {
  files: ScoreFile[];
  onChange: (files: ScoreFile[]) => void;
}

function getFileIconInfo(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return { icon: "fa-solid fa-file-pdf", className: styles.iconPdf };
  }
  if (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif")
  ) {
    return { icon: "fa-solid fa-file-image", className: styles.iconImage };
  }
  if (lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".wav")) {
    return { icon: "fa-solid fa-file-audio", className: styles.iconAudio };
  }
  return { icon: "fa-solid fa-file-lines", className: styles.iconOther };
}

export function ScoreFileUpload({ files, onChange }: ScoreFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processUpload = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    showSpinner();
    try {
      const newFiles = [...files];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const fileName = file.name;
        // Storageパスを生成 (ファイル名の後ろにタイムスタンプを付与)
        const timestamp = Date.now();
        const lastDot = fileName.lastIndexOf(".");
        const ext = lastDot !== -1 ? fileName.slice(lastDot) : "";
        const base = lastDot !== -1 ? fileName.slice(0, lastDot) : fileName;
        const safeBase = base.replace(/[^a-zA-Z0-9._-]/g, "_");
        const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "_");
        const path = `scores/files/${safeBase}_${timestamp}${safeExt}`;
        const storageRef = ref(storage, path);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newFiles.push({ name: fileName, url, path });
      }
      newFiles.sort((a, b) =>
        a.name.localeCompare(b.name, "ja", { numeric: true, sensitivity: "base" })
      );
      onChange(newFiles);
    } catch (err) {
      console.error("Score file upload failed:", err);
      showDialog("ファイルのアップロードに失敗しました。時間をおいて再試行してください。");
    } finally {
      hideSpinner();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processUpload(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUpload(e.dataTransfer.files);
    }
  };

  const sortedFiles = [...files].sort((a, b) =>
    a.name.localeCompare(b.name, "ja", { numeric: true, sensitivity: "base" })
  );

  const handleRemove = async (fileToRemove: ScoreFile) => {
    const confirmed = await showDialog(`「${fileToRemove.name}」を削除しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      if (fileToRemove.path) {
        try {
          const storageRef = ref(storage, fileToRemove.path);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.warn("Storage deletion error (might not exist):", storageErr);
        }
      }
      const newFiles = files.filter(
        (f) => !(f.path === fileToRemove.path && f.name === fileToRemove.name)
      );
      onChange(newFiles);
    } catch (err) {
      console.error("Failed to delete score file:", err);
      showDialog("ファイルの削除に失敗しました。");
    } finally {
      hideSpinner();
    }
  };

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <i className={`fa-solid fa-cloud-arrow-up ${styles.uploadIcon}`} />
        <p className={styles.dropZoneText}>
          クリックまたはファイルをドラッグ＆ドロップして追加
        </p>
        <p className={styles.dropZoneHint}>
          PDF、画像、音源など複数ファイルを同時にアップロードできます
        </p>
        <button
          type="button"
          className={styles.uploadButton}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          <i className="fa-solid fa-plus" /> ファイルを選択
        </button>
      </div>

      {sortedFiles.length > 0 && (
        <ul className={styles.fileList}>
          {sortedFiles.map((file, idx) => {
            const iconInfo = getFileIconInfo(file.name);
            return (
              <li key={idx} className={styles.fileItem}>
                <div className={`${styles.fileIcon} ${iconInfo.className}`}>
                  <i className={iconInfo.icon} />
                </div>
                <span className={styles.fileName}>{file.name}</span>
                <div className={styles.fileActions}>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.actionButton}
                    title="プレビュー・確認"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                  </a>
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => handleRemove(file)}
                    title="削除"
                  >
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
