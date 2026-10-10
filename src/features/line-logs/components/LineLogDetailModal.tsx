"use client";

import React, { useEffect } from "react";
import { LineNotificationLog } from "@/src/lib/firestore/types";
import styles from "./LineLogDetailModal.module.css";

interface LineLogDetailModalProps {
  log: LineNotificationLog | null;
  onClose: () => void;
}

export default function LineLogDetailModal({ log, onClose }: LineLogDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!log) return null;

  const isSuccess = log.status === "success";
  const isGroup = log.accountType === "group" || log.recipientType === "group" || log.recipientUid === "group";
  const details = log.details || {};

  // テキスト内のURLを検出してクリッカブルなリンクとしてレンダリングする
  const renderMessageContent = (text?: string) => {
    if (!text) return "（テキストなし）";

    const urlRegex = /(https?:\/\/[^\s　\n]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(/^https?:\/\//)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.messageLink}
            onClick={(e) => e.stopPropagation()}
            title={part}
          >
            <span>{part}</span>
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.75em", marginLeft: "4px" }} />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            <i className="fa-solid fa-message" style={{ color: "#06c755" }}></i>
            <span>{log.notificationTitle} の詳細</span>
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="閉じる">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* ボディ */}
        <div className={styles.body}>
          {/* メタ情報サマリー */}
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>送信日時</span>
              <span className={styles.metaValue}>{log.sentAtFormatted || log.date}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>送信ステータス</span>
              <span className={styles.metaValue}>
                {isSuccess ? (
                  <span className={styles.badgeSuccess}>
                    <i className="fa-solid fa-circle-check"></i> 送信成功
                  </span>
                ) : (
                  <span className={styles.badgeError}>
                    <i className="fa-solid fa-circle-exclamation"></i> 送信エラー ({log.statusCode || "不明"})
                  </span>
                )}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>送信元アカウント</span>
              <span className={styles.metaValue}>{log.accountName}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>送信先</span>
              <span className={styles.metaValue}>
                {log.recipientName || (isGroup ? "全体グループ (バンドLINE)" : "メンバー")}
                {!isGroup && log.recipientUid && ` (${log.recipientUid.substring(0, 6)}...)`}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>消費吹き出し数</span>
              <span className={styles.metaValue}>
                <strong>{log.messageCount || 1}</strong> 通
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>LINE 宛先 ID</span>
              <span className={styles.metaValue} style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {log.recipientLineId ? `${log.recipientLineId.substring(0, 12)}...` : "未設定"}
              </span>
            </div>
          </div>

          {/* エラーメッセージ（あれば表示） */}
          {log.errorMessage && (
            <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "12px", borderRadius: "10px", color: "#991b1b", fontSize: "0.85rem" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "6px" }}></i>
              {log.errorMessage}
            </div>
          )}

          {/* LINEトーク画面風プレビュー */}
          <div className={styles.previewSection}>
            <div className={styles.previewLabel}>
              <i className="fa-brands fa-line" style={{ color: "#06c755", fontSize: "1.1rem" }}></i>
              <span>送信されたメッセージ（LINEトーク再現）</span>
            </div>
            <div className={styles.chatContainer}>
              {log.messages && log.messages.length > 0 ? (
                log.messages.map((msg, index) => {
                  if (msg.type === "image" && (msg.originalContentUrl || msg.previewImageUrl)) {
                    const imgUrl = msg.originalContentUrl || msg.previewImageUrl;
                    return (
                      <div key={index} className={styles.imageBubble}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgUrl} alt="LINE添付画像" />
                        <div className={styles.imageCaption}>
                          <i className="fa-regular fa-image" style={{ marginRight: "4px" }}></i>
                          添付画像
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={index} className={styles.messageBubble}>
                      {renderMessageContent(msg.text)}
                    </div>
                  );
                })
              ) : (
                <div className={styles.messageBubble}>
                  {renderMessageContent(log.summary)}
                </div>
              )}
            </div>
          </div>

          {/* 送信メタデータ */}
          {(log.sourceCollection || log.sourceDocId || Object.keys(details).length > 0) && (
            <div className={styles.detailsSection}>
              <div className={styles.previewLabel}>
                <i className="fa-solid fa-circle-info" style={{ color: "#3b82f6" }}></i>
                <span>送信メタ情報</span>
              </div>
              <div className={styles.detailsContainer}>
                {log.sourceCollection && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailTitle}>関連機能</span>
                    <span className={styles.detailContent}>{log.sourceCollection}</span>
                  </div>
                )}
                {log.sourceDocId && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailTitle}>データID</span>
                    <span className={styles.detailContent}>{log.sourceDocId}</span>
                  </div>
                )}
                {details.messageId && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailTitle}>LINE Message ID</span>
                    <span className={styles.detailContent}>{details.messageId}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className={styles.footer}>
          <button className={styles.closeFooterBtn} onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
