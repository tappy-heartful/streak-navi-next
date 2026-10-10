import { db } from "@/src/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { LineNotificationLog } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

export const MONTHLY_QUOTA_LIMIT = 200; // LINE公式アカウント無料プランの月間上限通数（吹き出し数）

export interface AccountQuotaInfo {
  accountType: "group" | "individual";
  accountName: string;
  consumed: number; // 使用通数
  remaining: number; // 残り通数
  limit: number; // 上限 (200)
  usageRate: number; // 使用率 (0〜100%)
  statusLevel: "safe" | "warning" | "danger"; // safe (<60%), warning (60-85%), danger (>85%)
}

export interface MonthQuotaSummary {
  yearMonth: string;
  group: AccountQuotaInfo;
  individual: AccountQuotaInfo;
  totalConsumed: number;
}

/**
 * 指定した年月のLINE送信ログ一覧を取得する
 * @param yearMonth "YYYY-MM" (例: "2026-10")
 */
export async function getLineNotificationLogsByMonth(yearMonth: string): Promise<LineNotificationLog[]> {
  const logs: LineNotificationLog[] = [];

  // 1. lineNotificationLogs から取得
  try {
    const logsRef = collection(db, "lineNotificationLogs");
    const q = query(logsRef, where("yearMonth", "==", yearMonth));
    const snap = await getDocs(q);

    snap.forEach((doc) => {
      logs.push(toPlainObject(doc) as LineNotificationLog);
    });
  } catch (err) {
    console.error("Failed to query lineNotificationLogs by yearMonth:", err);
    try {
      const logsRef = collection(db, "lineNotificationLogs");
      const fallbackSnap = await getDocs(logsRef);
      fallbackSnap.forEach((doc) => {
        const item = toPlainObject(doc) as LineNotificationLog;
        if (item.yearMonth === yearMonth) {
          logs.push(item);
        }
      });
    } catch (fallbackErr) {
      console.warn("Fallback fetch also failed for lineNotificationLogs:", fallbackErr);
    }
  }

  // 2. 過去の互換性: notificationHistorys (グループ全体通知の旧ログ) からも取得してマージ
  try {
    const legacyHistoryRef = collection(db, "notificationHistorys");
    const legacySnap = await getDocs(legacyHistoryRef);
    legacySnap.forEach((doc) => {
      const d = doc.data();
      const sentAtDate = d.sentAt?.toDate ? d.sentAt.toDate() : (d.sentAt ? new Date(d.sentAt) : null);
      if (!sentAtDate) return;

      const ym = `${sentAtDate.getFullYear()}-${String(sentAtDate.getMonth() + 1).padStart(2, "0")}`;
      if (ym !== yearMonth) return;

      const id = doc.id;
      // 既に lineNotificationLogs に同一IDや同一messageIdがあるかチェック
      if (logs.some((l) => l.id === id || (d.messageId && l.details?.messageId === d.messageId))) {
        return;
      }

      const text = d.content || "";
      const lines = text.split("\n").filter((l: string) => l.trim().length > 0);
      const summary = lines.slice(0, 2).join(" / ") || d.title || "グループ通知";

      const formatted = `${sentAtDate.getFullYear()}/${String(sentAtDate.getMonth() + 1).padStart(2, "0")}/${String(sentAtDate.getDate()).padStart(2, "0")} ${String(sentAtDate.getHours()).padStart(2, "0")}:${String(sentAtDate.getMinutes()).padStart(2, "0")}:${String(sentAtDate.getSeconds()).padStart(2, "0")}`;
      const dateStr = `${sentAtDate.getFullYear()}-${String(sentAtDate.getMonth() + 1).padStart(2, "0")}-${String(sentAtDate.getDate()).padStart(2, "0")}`;

      logs.push({
        id,
        accountType: "group",
        accountName: "全体グループ通知",
        notificationType: d.sourceCollection === "events" ? "event" : d.sourceCollection === "votes" ? "vote" : d.sourceCollection === "calls" ? "call" : "other",
        notificationTitle: d.title || "全体自動通知",
        recipientType: "group",
        recipientUid: "group",
        recipientName: "全体グループ (バンドLINE)",
        recipientLineId: "group",
        messages: [{ type: "text", text: text }],
        messageCount: 1,
        summary: summary.length > 80 ? summary.substring(0, 80) + "..." : summary,
        details: { messageId: d.messageId, sourceCollection: d.sourceCollection, sourceDocId: d.sourceDocId },
        status: "success",
        sentAt: sentAtDate.getTime(),
        sentAtFormatted: formatted,
        yearMonth: ym,
        date: dateStr,
        sourceCollection: d.sourceCollection,
        sourceDocId: d.sourceDocId,
      });
    });
  } catch (legacyErr) {
    console.warn("Legacy notificationHistorys fetch skipped/failed:", legacyErr);
  }

  // 3. 過去の互換性: notificationIndividualHistorys (個人通知の旧ログ) からも取得してマージ
  try {
    const indivHistoryRef = collection(db, "notificationIndividualHistorys");
    const indivSnap = await getDocs(indivHistoryRef);
    indivSnap.forEach((doc) => {
      const d = doc.data();
      const sentAtDate = d.sentAt?.toDate ? d.sentAt.toDate() : (d.sentAt ? new Date(d.sentAt) : null);
      if (!sentAtDate) return;

      const ym = `${sentAtDate.getFullYear()}-${String(sentAtDate.getMonth() + 1).padStart(2, "0")}`;
      if (ym !== yearMonth) return;

      const id = doc.id;
      if (logs.some((l) => l.id === id || (d.messageId && l.details?.messageId === d.messageId))) {
        return;
      }

      const text = d.content || "";
      const lines = text.split("\n").filter((l: string) => l.trim().length > 0);
      const summary = lines.slice(0, 2).join(" / ") || d.title || "個人通知";

      const formatted = `${sentAtDate.getFullYear()}/${String(sentAtDate.getMonth() + 1).padStart(2, "0")}/${String(sentAtDate.getDate()).padStart(2, "0")} ${String(sentAtDate.getHours()).padStart(2, "0")}:${String(sentAtDate.getMinutes()).padStart(2, "0")}:${String(sentAtDate.getSeconds()).padStart(2, "0")}`;
      const dateStr = `${sentAtDate.getFullYear()}-${String(sentAtDate.getMonth() + 1).padStart(2, "0")}-${String(sentAtDate.getDate()).padStart(2, "0")}`;

      logs.push({
        id,
        accountType: "individual",
        accountName: "個別通知BOT",
        notificationType: d.sourceCollection === "issues" ? "todo" : d.sourceCollection === "accounting" ? "accounting" : "other",
        notificationTitle: d.title || "個別通知リマインド",
        recipientType: "individual",
        recipientUid: d.uid || "",
        recipientName: d.userName && !/^U[a-zA-Z0-9]{10,}$/.test(d.userName.trim()) ? d.userName : "メンバー",
        recipientLineId: "",
        messages: [{ type: "text", text: text }],
        messageCount: 1,
        summary: summary.length > 80 ? summary.substring(0, 80) + "..." : summary,
        details: { messageId: d.messageId, sourceCollection: d.sourceCollection, sourceDocId: d.sourceDocId },
        status: "success",
        sentAt: sentAtDate.getTime(),
        sentAtFormatted: formatted,
        yearMonth: ym,
        date: dateStr,
        sourceCollection: d.sourceCollection,
        sourceDocId: d.sourceDocId,
      });
    });
  } catch (indivErr) {
    console.warn("Legacy notificationIndividualHistorys fetch skipped/failed:", indivErr);
  }

  // 送信日時の降順（新しい順）でソート
  logs.sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));

  return logs;
}

/**
 * 送信ログ一覧からアカウント別（グループ全体 / 個別通知）の残通数・使用状況サマリーを計算する
 */
export function calculateMonthQuotaSummary(yearMonth: string, logs: LineNotificationLog[]): MonthQuotaSummary {
  let groupConsumed = 0;
  let individualConsumed = 0;

  logs.forEach((log) => {
    const count = log.messageCount || (log.messages?.length || 1);
    if (log.accountType === "individual" || log.recipientType === "individual") {
      individualConsumed += count;
    } else {
      // "group" またはその他（デフォルトはグループ配信アカウント）
      groupConsumed += count;
    }
  });

  const getStatusLevel = (rate: number): "safe" | "warning" | "danger" => {
    if (rate >= 85) return "danger";
    if (rate >= 60) return "warning";
    return "safe";
  };

  const groupRate = Math.min(100, Math.round((groupConsumed / MONTHLY_QUOTA_LIMIT) * 100));
  const indivRate = Math.min(100, Math.round((individualConsumed / MONTHLY_QUOTA_LIMIT) * 100));

  return {
    yearMonth,
    group: {
      accountType: "group",
      accountName: "全体グループ通知アカウント",
      consumed: groupConsumed,
      remaining: Math.max(0, MONTHLY_QUOTA_LIMIT - groupConsumed),
      limit: MONTHLY_QUOTA_LIMIT,
      usageRate: groupRate,
      statusLevel: getStatusLevel(groupRate),
    },
    individual: {
      accountType: "individual",
      accountName: "個別通知アカウント",
      consumed: individualConsumed,
      remaining: Math.max(0, MONTHLY_QUOTA_LIMIT - individualConsumed),
      limit: MONTHLY_QUOTA_LIMIT,
      usageRate: indivRate,
      statusLevel: getStatusLevel(indivRate),
    },
    totalConsumed: groupConsumed + individualConsumed,
  };
}
