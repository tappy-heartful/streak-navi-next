"use client";

import React from "react";
import { LineNotificationLog } from "@/src/lib/firestore/types";
import styles from "./LineLogItem.module.css";

interface LineLogItemProps {
  log: LineNotificationLog;
  onClick: () => void;
}

export default function LineLogItem({ log, onClick }: LineLogItemProps) {
  const isGroup = log.accountType === "group" || log.recipientType === "group" || log.recipientUid === "group";
  const isSuccess = log.status === "success";
  const count = log.messageCount || (log.messages?.length || 1);
  const hasImage = log.messages?.some((m) => m.type === "image");

  const getTypeIcon = () => {
    switch (log.notificationType) {
      case "event":
        return <i className="fa-solid fa-calendar-days" style={{ color: "#2563eb" }}></i>;
      case "accounting":
        return <i className="fa-solid fa-scale-balanced" style={{ color: "#d97706" }}></i>;
      case "todo":
        return <i className="fa-solid fa-list-check" style={{ color: "#7c3aed" }}></i>;
      case "vote":
        return <i className="fa-solid fa-check-to-slot" style={{ color: "#059669" }}></i>;
      case "call":
        return <i className="fa-solid fa-bullhorn" style={{ color: "#ea580c" }}></i>;
      default:
        return isGroup ? (
          <i className="fa-solid fa-users" style={{ color: "#059669" }}></i>
        ) : (
          <i className="fa-solid fa-bell" style={{ color: "#7c3aed" }}></i>
        );
    }
  };

  return (
    <div className={styles.itemCard} onClick={onClick}>
      <div className={styles.topRow}>
        <div className={styles.badges}>
          <span
            className={`${styles.accountBadge} ${
              isGroup ? styles.accountGroup : styles.accountIndividual
            }`}
          >
            {isGroup ? "全体グループ通知" : "個別通知BOT"}
          </span>
          <span className={styles.typeBadge}>
            {log.notificationTitle || "LINE通知"}
          </span>
        </div>
        <span className={styles.timeText}>
          <i className="fa-regular fa-clock"></i>
          {log.sentAtFormatted ? log.sentAtFormatted.substring(5, 16) : log.date}
        </span>
      </div>

      <div className={styles.mainRow}>
        <div className={styles.contentBlock}>
          <h4 className={styles.titleText}>
            {getTypeIcon()}
            <span>{log.notificationTitle}</span>
          </h4>
          <p className={styles.summaryText}>{log.summary || "詳細をタップして確認"}</p>
        </div>

        <div className={styles.rightBlock}>
          <span
            className={`${styles.quotaCostBadge} ${
              hasImage ? styles.quotaCostBadgeWithImage : ""
            }`}
          >
            {hasImage ? (
              <>
                <i className="fa-regular fa-images"></i> 2通消費 (画像含)
              </>
            ) : (
              <>
                <i className="fa-regular fa-comment"></i> {count}通消費
              </>
            )}
          </span>
        </div>
      </div>

      <div className={styles.bottomRow}>
        <span className={styles.recipientText} title={log.recipientName}>
          <i className={isGroup ? "fa-solid fa-users" : "fa-regular fa-user"}></i>
          宛先: {log.recipientName || (isGroup ? "全体グループ" : "メンバー")}
        </span>
        <div>
          {!isSuccess ? (
            <span className={styles.errorTag}>
              <i className="fa-solid fa-triangle-exclamation"></i> 送信エラー
            </span>
          ) : (
            <span className={styles.detailLink}>
              詳細を見る <i className="fa-solid fa-chevron-right" style={{ fontSize: "0.7rem" }}></i>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
