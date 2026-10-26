"use client";

import React, { useEffect, useState, useRef } from "react";
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
  const [prefetchedUrl, setPrefetchedUrl] = useState<string | null>(null);
  const prefetchPromiseRef = useRef<Promise<string> | null>(null);

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

  // ファイル選択時に裏で署名付きURLを先行取得（同意モーダル確認中に完了させ、タップ時に完全同期で開けるようにする）
  const handleSelectFile = (file: ScoreFile) => {
    setPendingFile(file);
    setPrefetchedUrl(null);

    if (file.path) {
      const promise = getScoreSignedUrl(file.path, file.name)
        .then((url) => {
          setPrefetchedUrl(url);
          return url;
        })
        .catch((err) => {
          console.error("Signed URL prefetch error:", err);
          return "";
        });
      prefetchPromiseRef.current = promise;
    } else if (file.url) {
      setPrefetchedUrl(file.url);
      prefetchPromiseRef.current = Promise.resolve(file.url);
    } else {
      prefetchPromiseRef.current = null;
    }
  };

  const handleCloseConsent = () => {
    setPendingFile(null);
    setPrefetchedUrl(null);
    prefetchPromiseRef.current = null;
  };

  // iOS PWA, LINE内ブラウザ, 通常ブラウザのすべてに対応した安全な開き方
  const openFileUrlCompatibly = (url: string, existingWindow?: Window | null) => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isLine = /Line/i.test(ua);
    const isStandalone =
      typeof window !== "undefined" &&
      ((window.navigator as any).standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches);

    if (isLine) {
      if (existingWindow) existingWindow.close();
      // LINE内ブラウザ: 署名を改ざんせず直接遷移して開く
      window.location.href = url;
    } else if (isStandalone) {
      if (existingWindow) existingWindow.close();
      // iOS PWA: aタグのクリックで外部Safariを起動 (白画面クラッシュを完全防止)
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // 通常ブラウザ (Safari, Chrome 等)
      if (existingWindow && !existingWindow.closed) {
        existingWindow.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  };

  const handleConfirmDownload = async () => {
    if (!pendingFile) return;

    // ログ記録は非同期・バックグラウンドで実行（UIをブロックしない）
    void recordScoreDownloadLog({
      scoreId,
      scoreTitle: title,
      fileName: pendingFile.name,
      fileUrl: pendingFile.path || pendingFile.url,
      user,
    });

    // パターン1: 同意モーダル表示中に先行取得が完了している場合（通常ケース）
    // ★ ここは完全な同期的コンテキスト！awaitなし！
    // iPhone Safari でも「このサイトではポップアップウィンドウが開きます」は出ない！
    if (prefetchedUrl) {
      openFileUrlCompatibly(prefetchedUrl);
      return;
    }

    // パターン2: ユーザーが素早くタップして先行取得が未完了の場合
    // タップの同期的瞬間に事前ウィンドウを開いておくことでSafariの非同期ポップアップブロックを回避
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isLine = /Line/i.test(ua);
    let targetWindow: Window | null = null;
    if (!isLine) {
      targetWindow = window.open("about:blank", "_blank");
    }

    showSpinner();
    try {
      let finalUrl = "";
      if (prefetchPromiseRef.current) {
        finalUrl = await prefetchPromiseRef.current;
      }
      if (!finalUrl) {
        if (pendingFile.path) {
          finalUrl = await getScoreSignedUrl(pendingFile.path, pendingFile.name);
        } else if (pendingFile.url) {
          finalUrl = pendingFile.url;
        }
      }

      if (finalUrl) {
        openFileUrlCompatibly(finalUrl, targetWindow);
      } else {
        if (targetWindow) targetWindow.close();
        showDialog("譜面データの取得に失敗しました。時間をおいて再試行してください。");
      }
    } catch (err) {
      console.error("Score file access failed:", err);
      if (targetWindow) targetWindow.close();
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
                        onClick={() => handleSelectFile(file)}
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
        onClose={handleCloseConsent}
        onConfirm={handleConfirmDownload}
        targetFileName={pendingFile?.name}
      />
    </>
  );
}
