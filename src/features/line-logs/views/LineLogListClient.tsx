"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { LineNotificationLog } from "@/src/lib/firestore/types";
import {
  getLineNotificationLogsByMonth,
  calculateMonthQuotaSummary,
  MonthQuotaSummary,
} from "../api/line-log-client-service";
import LineQuotaCard from "../components/LineQuotaCard";
import LineLogItem from "../components/LineLogItem";
import LineLogDetailModal from "../components/LineLogDetailModal";
import styles from "./LineLogList.module.css";

// 現在の日本時間の年月文字列 "YYYY-MM" を生成する
const getInitialYearMonth = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export default function LineLogListClient() {
  const { userData, loading: authLoading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const canView = Boolean(userData?.isSystemAdmin || userData?.isLineLogAdmin);

  const [currentYearMonth, setCurrentYearMonth] = useState<string>(getInitialYearMonth());
  const [logs, setLogs] = useState<LineNotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<LineNotificationLog | null>(null);

  // フィルター状態
  const [accountFilter, setAccountFilter] = useState<"all" | "group" | "individual">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // パンくずリストの設定
  useEffect(() => {
    setBreadcrumbs([
      { title: "通知設定", href: "/notice" },
      { title: "LINE送信履歴" },
    ]);
  }, [setBreadcrumbs]);

  // ログの取得関数
  const fetchLogs = useCallback(async (yearMonth: string) => {
    setIsLoading(true);
    try {
      const data = await getLineNotificationLogsByMonth(yearMonth);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load line notification logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 年月切り替え時にデータ取得
  useEffect(() => {
    if (authLoading) return;
    if (!canView) {
      setIsLoading(false);
      return;
    }
    fetchLogs(currentYearMonth);
  }, [currentYearMonth, fetchLogs, authLoading, canView]);

  // クォータ（配信枠）サマリーの計算
  const quotaSummary: MonthQuotaSummary = useMemo(() => {
    return calculateMonthQuotaSummary(currentYearMonth, logs);
  }, [currentYearMonth, logs]);

  // フィルタリングされたログリスト
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. アカウントフィルター（全体グループ / 個別）
      if (accountFilter === "group") {
        const isGroup = log.accountType === "group" || log.recipientType === "group" || log.recipientUid === "group";
        if (!isGroup) return false;
      } else if (accountFilter === "individual") {
        const isGroup = log.accountType === "group" || log.recipientType === "group" || log.recipientUid === "group";
        if (isGroup) return false;
      }

      // 2. 種別フィルター
      if (typeFilter !== "all") {
        if (typeFilter === "event" && log.notificationType !== "event") return false;
        if (typeFilter === "accounting" && log.notificationType !== "accounting") return false;
        if (typeFilter === "todo" && log.notificationType !== "todo") return false;
        if (typeFilter === "vote_call" && !["vote", "call"].includes(log.notificationType)) return false;
      }

      // 3. キーワード検索（宛先名、タイトル、メッセージ内容）
      if (searchKeyword.trim() !== "") {
        const q = searchKeyword.toLowerCase();
        const matchTitle = (log.notificationTitle || "").toLowerCase().includes(q);
        const matchRecipient = (log.recipientName || "").toLowerCase().includes(q);
        const matchSummary = (log.summary || "").toLowerCase().includes(q);
        const matchMessages = (log.messages || []).some((m) => (m.text || "").toLowerCase().includes(q));
        if (!matchTitle && !matchRecipient && !matchSummary && !matchMessages) {
          return false;
        }
      }

      return true;
    });
  }, [logs, accountFilter, typeFilter, searchKeyword]);

  // 年月操作ヘルパー
  const handlePrevMonth = () => {
    const [y, m] = currentYearMonth.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newY = prevDate.getFullYear();
    const newM = String(prevDate.getMonth() + 1).padStart(2, "0");
    setCurrentYearMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentYearMonth.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const newY = nextDate.getFullYear();
    const newM = String(nextDate.getMonth() + 1).padStart(2, "0");
    setCurrentYearMonth(`${newY}-${newM}`);
  };

  // 年月表示文字列（例: 2026年10月）
  const displayMonthLabel = useMemo(() => {
    const [y, m] = currentYearMonth.split("-").map(Number);
    return `${y}年${m}月`;
  }, [currentYearMonth]);

  const groupLogsCount = useMemo(() => {
    return logs.filter((l) => l.accountType === "group" || l.recipientType === "group" || l.recipientUid === "group").length;
  }, [logs]);

  const indivLogsCount = useMemo(() => {
    return logs.filter((l) => !(l.accountType === "group" || l.recipientType === "group" || l.recipientUid === "group")).length;
  }, [logs]);

  // 認証確認中のローディング表示
  if (authLoading) {
    return (
      <div className={styles.pageWrapper}>
        <div style={{ padding: "60px 16px", textAlign: "center", color: "#64748b" }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "1.8rem", color: "#06c755", marginBottom: "12px", display: "block" }} />
          <span>認証情報を確認中...</span>
        </div>
      </div>
    );
  }

  // システム管理者またはLINE送信履歴管理者以外は閲覧不可
  if (!canView) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.unauthorizedCard}>
          <div className={styles.unauthorizedIcon}>
            <i className="fa-solid fa-shield-halved" />
          </div>
          <h2 className={styles.unauthorizedTitle}>アクセス権限がありません</h2>
          <p className={styles.unauthorizedText}>
            LINE送信履歴および配信枠状況の閲覧は、システム管理者またはLINE送信履歴管理者のみ許可されています。
          </p>
          <Link href="/" className={styles.homeBtn}>
            <i className="fa-solid fa-house" />
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* ヘッダーエリア */}
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>
          <i className="fa-solid fa-paper-plane"></i>
          <span>LINE送信履歴</span>
        </h1>
        <div className={styles.headerActions}>
          <button
            className={styles.refreshBtn}
            onClick={() => fetchLogs(currentYearMonth)}
            disabled={isLoading}
            title="最新の情報に更新"
          >
            <i className={`fa-solid fa-rotate-right ${isLoading ? "fa-spin" : ""}`}></i>
            <span>更新</span>
          </button>
        </div>
      </div>

      {/* 年月セレクター */}
      <div className={styles.monthControlCard}>
        <button
          className={styles.monthNavBtn}
          onClick={handlePrevMonth}
          title="前月"
          aria-label="前月"
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>

        <div className={styles.monthDisplay}>
          <i className="fa-regular fa-calendar" style={{ color: "#06c755" }}></i>
          <span>{displayMonthLabel}</span>
        </div>

        <button
          className={styles.monthNavBtn}
          onClick={handleNextMonth}
          title="翌月"
          aria-label="翌月"
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      {/* 残通数・配信状況ゲージカード */}
      <LineQuotaCard
        quotaSummary={quotaSummary}
        displayMonthLabel={displayMonthLabel}
      />

      {/* 絞り込みフィルターカード */}
      <div className={styles.filterCard}>
        <div className={styles.filterTabs}>
          <button
            className={`${styles.filterTab} ${accountFilter === "all" ? styles.filterTabActive : ""}`}
            onClick={() => setAccountFilter("all")}
          >
            すべて ({logs.length})
          </button>
          <button
            className={`${styles.filterTab} ${accountFilter === "group" ? styles.filterTabActive : ""}`}
            onClick={() => setAccountFilter("group")}
          >
            <i className="fa-solid fa-users" style={{ fontSize: "0.75rem" }}></i>
            全体グループ通知 ({groupLogsCount})
          </button>
          <button
            className={`${styles.filterTab} ${accountFilter === "individual" ? styles.filterTabActive : ""}`}
            onClick={() => setAccountFilter("individual")}
          >
            <i className="fa-solid fa-user-check" style={{ fontSize: "0.75rem" }}></i>
            個別通知BOT ({indivLogsCount})
          </button>
        </div>

        <div className={styles.filterSubRow}>
          <div className={styles.typeFilterGroup}>
            <i className="fa-solid fa-filter" style={{ color: "#94a3b8" }}></i>
            <span>種別:</span>
            <select
              className={styles.typeSelect}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">すべての種別</option>
              <option value="event">イベント出欠・調整</option>
              <option value="accounting">バランス会計精算</option>
              <option value="todo">TODOリマインド</option>
              <option value="vote_call">投票・選曲募集</option>
            </select>

            <input
              type="text"
              placeholder="宛先・キーワードで検索..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className={styles.typeSelect}
              style={{ minWidth: "160px" }}
            />
          </div>

          <div className={styles.logCountText}>
            表示中: <strong>{filteredLogs.length}</strong> 件
          </div>
        </div>
      </div>

      {/* ログ一覧 */}
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>送信履歴を読み込み中...</p>
        </div>
      ) : filteredLogs.length > 0 ? (
        <div className={styles.logListContainer}>
          {filteredLogs.map((log) => (
            <LineLogItem
              key={log.id}
              log={log}
              onClick={() => setSelectedLog(log)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>
            <i className="fa-regular fa-paper-plane"></i>
          </div>
          <h3 className={styles.emptyTitle}>
            {logs.length === 0
              ? `${displayMonthLabel}の送信履歴はありません`
              : "条件に一致する送信履歴がありません"}
          </h3>
          <p className={styles.emptyDesc}>
            {logs.length === 0
              ? "GASの全体自動通知や、未払い・TODOの個別催促が送信されると、ここに詳細なメッセージ内容や消費通数が記録されます。"
              : "フィルター条件を変更して再度ご確認ください。"}
          </p>
        </div>
      )}

      {/* 詳細モーダル */}
      <LineLogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />

      {/* 下部ナビゲーション */}
      <div className={styles.navBottom}>
        <Link href="/notice" className={styles.backNoticeLink}>
          <i className="fa-solid fa-arrow-left"></i> 通知設定に戻る
        </Link>
      </div>
    </div>
  );
}
