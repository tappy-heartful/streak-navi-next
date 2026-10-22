"use client";

import React, { useEffect, useState } from "react";
import { ScoreFile } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { recordScoreDownloadLog } from "@/src/features/scores/api/score-client-service";
import { getScoreSignedUrl } from "@/src/features/scores/api/score-signed-url-action";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";
import { ScoreDownloadConsentModal } from "./ScoreDownloadConsentModal";
import styles from "./ScoreFileListModal.module.css";

interface ScoreFileListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  scoreId?: string;
  files?: ScoreFile[];
  legacyScoreUrl?: string;
}

function getFileIconInfo(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return {
      icon: "fa-solid fa-file-pdf",
      className: styles.iconPdf,
      label: "PDF",
    };
  }
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif")) {
    return {
      icon: "fa-solid fa-file-image",
      className: styles.iconImage,
      label: "画像",
    };
  }
  if (lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".wav")) {
    return {
      icon: "fa-solid fa-file-audio",
      className: styles.iconAudio,
      label: "音声",
    };
  }
  return {
    icon: "fa-solid fa-file-lines",
    className: styles.iconOther,
    label: "ファイル",
  };
}

export function ScoreFileListModal({
  isOpen,
  onClose,
  title,
  scoreId,
  files,
  legacyScoreUrl,
}: ScoreFileListModalProps) {
  const { user } = useAuth();
  const [pendingFile, setPendingFile] = useState<ScoreFile | null>(null);

  // ESCキーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // files が空で legacyScoreUrl がある場合はフォールバック
  const rawFiles: ScoreFile[] =
    files && files.length > 0
      ? files
      : legacyScoreUrl
      ? [{ name: `${title}（Google Drive 譜面）`, url: legacyScoreUrl, path: "" }]
      : [];

  // ファイル名昇順（自然順ソート）で整列
  const displayFiles = [...rawFiles].sort((a, b) =>
    a.name.localeCompare(b.name, "ja", { numeric: true, sensitivity: "base" })
  );

  // iOS PWA, LINE内ブラウザ, 通常ブラウザのすべてに対応した安全な開き方
  const openFileUrlCompatibly = (url: string) => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isLine = /Line/i.test(ua);
    const isStandalone =
      typeof window !== "undefined" &&
      ((window.navigator as any).standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches);

    if (isLine) {
      // LINE内ブラウザ: 署名を改ざんせず直接遷移して開く
      window.location.href = url;
    } else if (isStandalone) {
      // iOS PWA: aタグのクリックで外部Safariを起動 (白画面クラッシュを完全防止)
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // 通常ブラウザ: 別タブで開く
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleConfirmDownload = async () => {
    if (!pendingFile) return;

    showSpinner();
    try {
      void recordScoreDownloadLog({
        scoreId,
        scoreTitle: title,
        fileName: pendingFile.name,
        fileUrl: pendingFile.path || pendingFile.url,
        user,
      });

      if (pendingFile.path) {
        // 短期有効な署名付きURLを取得 (5分間で自動失効するセキュアURL)
        const signedUrl = await getScoreSignedUrl(pendingFile.path, pendingFile.name);
        openFileUrlCompatibly(signedUrl);
      } else if (pendingFile.url) {
        // 旧Google Drive等へのフォールバック
        openFileUrlCompatibly(pendingFile.url);
      }
    } catch (err) {
      console.error("Score file access failed:", err);
      showDialog("譜面データの取得に失敗しました。時間をおいて再試行してください。");
    } finally {
      hideSpinner();
    }
  };

  return (
    <>
      <div
        className={styles.modalOverlay}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-modal-title"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div className={styles.titleArea}>
              <i className={`fa-solid fa-music ${styles.headerIcon}`} />
              <h2 id="score-modal-title" className={styles.modalTitle}>
                {title}
              </h2>
            </div>
            <button
              type="button"
              className={styles.closeIconButton}
              onClick={onClose}
              aria-label="閉じる"
            >
              ×
            </button>
          </div>

          <div className={styles.modalBody}>
            {displayFiles.length > 0 ? (
              <ul className={styles.fileList}>
                {displayFiles.map((file, idx) => {
                  const iconInfo = getFileIconInfo(file.name);
                  return (
                    <li key={idx}>
                      <button
                        type="button"
                        className={styles.fileItem}
                        onClick={() => setPendingFile(file)}
                      >
                        <div className={`${styles.fileIconWrapper} ${iconInfo.className}`}>
                          <i className={iconInfo.icon} />
                        </div>
                        <div className={styles.fileInfo}>
                          <span className={styles.fileName}>{file.name}</span>
                          <span className={styles.fileHint}>タップして別タブで開く</span>
                        </div>
                        <div className={styles.fileAction}>
                          <span>開く</span>
                          <i className="fa-solid fa-arrow-up-right-from-square" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className={styles.emptyState}>
                <i className={`fa-solid fa-folder-open ${styles.emptyIcon}`} />
                <p className={styles.emptyText}>譜面ファイルは登録されていません</p>
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.closeButton} onClick={onClose}>
              閉じる
            </button>
          </div>
        </div>
      </div>

      <ScoreDownloadConsentModal
        isOpen={Boolean(pendingFile)}
        onClose={() => setPendingFile(null)}
        onConfirm={handleConfirmDownload}
        targetFileName={pendingFile?.name}
      />
    </>
  );
}
