"use client";

import React, { useEffect } from "react";
import styles from "./ScoreDownloadConsentModal.module.css";

interface ScoreDownloadConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetFileName?: string;
}

export function ScoreDownloadConsentModal({
  isOpen,
  onClose,
  onConfirm,
  targetFileName,
}: ScoreDownloadConsentModalProps) {
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

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-modal-title"
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.titleArea}>
            <span className={styles.warningIcon}>⚠️</span>
            <h2 id="consent-modal-title" className={styles.modalTitle}>
              譜面データダウンロードに関するご注意
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
          {targetFileName && (
            <div className={styles.targetFileBadge}>
              <i className={`fa-solid fa-file ${styles.targetFileIcon}`} />
              <span>{targetFileName}</span>
            </div>
          )}

          <div className={styles.noticeBox}>
            <p className={styles.noticeParagraph}>
              1. 本システムに掲載されている譜面・音源データは、サークル活動（練習および演奏）の目的でのみご利用いただけます。
            </p>
            <p className={styles.noticeParagraph}>
              2. データの外部への転載、SNSへのアップロード、部外者への共有（SNS・チャットツール等での送信）は固く禁止します。
            </p>
            <p className={styles.noticeParagraph}>
              3. 退団された場合は、手持ちのデータも含めて速やかに削除してください。
            </p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.agreeButton}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            <i className="fa-solid fa-check" />
            <span>同意して開く</span>
          </button>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
