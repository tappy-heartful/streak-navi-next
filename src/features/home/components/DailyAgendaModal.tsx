"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./DailyAgendaModal.module.css";

interface AgendaItem {
  type: "event" | "vote" | "call" | "issue";
  iconClass?: string;
  label: string;
  link: string;
  id: string;
  status?: string;
  position?: "start" | "middle" | "end";
  createdBy?: string;
  assigneeId?: string;
}

interface DailyAgendaModalProps {
  activeDateStr: string;
  items: AgendaItem[];
  onClose: () => void;
}

export function DailyAgendaModal({ activeDateStr, items, onClose }: DailyAgendaModalProps) {
  const router = useRouter();

  // Format date like "6月14日 (日)"
  const formattedDate = useMemo(() => {
    if (!activeDateStr) return "";
    const parts = activeDateStr.split(".");
    if (parts.length !== 3) return activeDateStr;
    const [y, m, d] = parts.map(Number);
    const dateObj = new Date(y, m - 1, d);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const dayStr = days[dateObj.getDay()];
    return `${m}月${d}日 (${dayStr})`;
  }, [activeDateStr]);

  const getThemeClass = (type: string) => {
    switch (type) {
      case "event":
        return styles.eventTheme;
      case "vote":
        return styles.voteTheme;
      case "call":
        return styles.callTheme;
      case "issue":
        return styles.issueTheme;
      default:
        return "";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "event":
        return "イベント";
      case "vote":
        return "曲投票";
      case "call":
        return "曲募集";
      case "issue":
        return "TODO";
      default:
        return type;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "not_started":
        return "未";
      case "in_progress":
        return "実施中";
      case "completed":
        return "済";
      default:
        return status || "";
    }
  };

  const getStatusClass = (status?: string) => {
    switch (status) {
      case "not_started":
        return styles.statusNotStarted;
      case "in_progress":
        return styles.statusInProgress;
      case "completed":
        return styles.statusCompleted;
      default:
        return "";
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.bottomSheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandleContainer}>
          <div className={styles.dragHandle} onClick={onClose} />
        </div>

        <div className={styles.headerRow}>
          <h2 className={styles.dateTitle}>{formattedDate}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Quick Add Actions */}
        <div className={styles.actionsGrid}>
          <Link
            href={`/event/edit?mode=new&date=${activeDateStr}`}
            className={`${styles.actionBtn} ${styles.eventBtn}`}
          >
            <i className="fa-solid fa-calendar-plus" /> イベント登録
          </Link>
          <Link
            href={`/issue/edit?mode=new&date=${activeDateStr}`}
            className={`${styles.actionBtn} ${styles.todoBtn}`}
          >
            <i className="fa-solid fa-square-check" /> TODO登録
          </Link>
        </div>

        {/* Items List */}
        <div className={styles.itemList}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fa-regular fa-calendar-minus" style={{ fontSize: "2rem", display: "block", marginBottom: "12px", opacity: 0.5 }} />
              予定・TODOはありません
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className={`${styles.itemRow} ${getThemeClass(item.type)}`}
                onClick={() => {
                  router.push(item.link);
                }}
              >
                <div className={styles.iconCol}>
                  <i className={item.iconClass || "fa-solid fa-circle-info"} />
                </div>
                <div className={styles.contentCol}>
                  <div className={styles.itemMeta}>
                    <span className={styles.typeBadge}>{getTypeLabel(item.type)}</span>
                    {item.type === "issue" && item.status && (
                      <span className={`${styles.statusBadge} ${getStatusClass(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    )}
                  </div>
                  <div className={styles.itemTitle}>{item.label}</div>
                </div>
                <div className={styles.arrowCol}>
                  <i className="fa-solid fa-chevron-right" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
