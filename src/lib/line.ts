/**
 * LINE Messaging API ユーティリティ (Server-only)
 */
import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";

export interface LineHistoryMetadata {
  sourceCollection: string;
  sourceDocId: string;
  title: string;
  notificationType?: "accounting" | "todo" | "event" | "vote" | "call" | "travel" | "other";
  recipientName?: string;
  recipientUid?: string;
}

/**
 * 個別メンバーへの LINE Push メッセージ送信
 */
export async function sendLinePushMessage(
  toLineUid: string,
  messages: any[],
  historyMetadata?: LineHistoryMetadata
): Promise<string | null> {
  const token = process.env.LINE_INDIV_ACCESS_TOKEN;
  if (!token) {
    console.warn("LINE_INDIV_ACCESS_TOKEN is not set. Skipping individual notification.");
    return null;
  }

  // LINE APIは最大5つのメッセージまで一度に送れる
  const chunks = [];
  for (let i = 0; i < messages.length; i += 5) {
    chunks.push(messages.slice(i, i + 5));
  }

  let lastMessageId: string | null = null;

  for (const chunk of chunks) {
    try {
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: toLineUid, messages: chunk }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`LINE Message failed: ${response.status} ${errorBody}`);
        continue;
      }

      const resJson = await response.json().catch(() => ({}));
      const messageId =
        resJson.sentMessages && resJson.sentMessages.length > 0
          ? resJson.sentMessages[0].id
          : "";
      lastMessageId = messageId || "sent";

      if (historyMetadata) {
        const content = chunk
          .map((m) => (m.type === "text" ? m.text : `[${m.type}]`))
          .join("\n\n");

        await adminDb.collection("notificationIndividualHistorys").add({
          messageId,
          content,
          sentAt: new Date(),
          sourceCollection: historyMetadata.sourceCollection,
          sourceDocId: historyMetadata.sourceDocId,
          title: historyMetadata.title,
        });

        // lineNotificationLogs にも記録
        try {
          const now = new Date();
          const jstOffset = 9 * 60;
          const jstDate = new Date(now.getTime() + (jstOffset + now.getTimezoneOffset()) * 60000);
          const yyyy = jstDate.getFullYear();
          const MM = String(jstDate.getMonth() + 1).padStart(2, "0");
          const dd = String(jstDate.getDate()).padStart(2, "0");
          const HH = String(jstDate.getHours()).padStart(2, "0");
          const mm = String(jstDate.getMinutes()).padStart(2, "0");
          const ss = String(jstDate.getSeconds()).padStart(2, "0");
          const sentAtFormatted = `${yyyy}/${MM}/${dd} ${HH}:${mm}:${ss}`;
          const yearMonth = `${yyyy}-${MM}`;
          const dateStr = `${yyyy}-${MM}-${dd}`;

          const sanitizedMessages = chunk.map((m) => {
            if (m.type === "text") return { type: "text", text: m.text };
            if (m.type === "image") return { type: "image", originalContentUrl: m.originalContentUrl, previewImageUrl: m.previewImageUrl };
            return m;
          });

          await adminDb.collection("lineNotificationLogs").add({
            accountType: "individual",
            accountName: "個別通知BOT",
            notificationType: historyMetadata.notificationType || (historyMetadata.sourceCollection === "issues" ? "todo" : historyMetadata.sourceCollection === "accountingSeasons" ? "accounting" : "other"),
            notificationTitle: historyMetadata.title,
            recipientType: "individual",
            recipientUid: historyMetadata.recipientUid || toLineUid,
            recipientName: historyMetadata.recipientName || "メンバー",
            recipientLineId: toLineUid,
            messages: sanitizedMessages,
            messageCount: chunk.length,
            summary: content.length > 80 ? content.substring(0, 80) + "..." : content,
            status: "success",
            statusCode: response.status,
            sentAt: now.getTime(),
            sentAtFormatted,
            yearMonth,
            date: dateStr,
            sourceCollection: historyMetadata.sourceCollection,
            sourceDocId: historyMetadata.sourceDocId,
            details: { messageId },
          });
        } catch (logErr) {
          console.warn("Failed to write to lineNotificationLogs:", logErr);
        }
      }
    } catch (err) {
      console.error("sendLinePushMessage exception:", err);
    }
  }

  return lastMessageId;
}

/**
 * 全体LINEグループへの Push メッセージ送信
 */
export async function sendLineGroupMessage(
  messages: any[],
  historyMetadata: LineHistoryMetadata,
  targetGroupId?: string
): Promise<string | null> {
  const token = process.env.LINE_GROUP_ACCESS_TOKEN;
  const groupId = targetGroupId || process.env.LINE_GROUP_ID;

  if (!token || !groupId) {
    console.warn("LINE_GROUP_ACCESS_TOKEN or LINE_GROUP_ID is not set. Skipping group notification.");
    return null;
  }

  const chunks = [];
  for (let i = 0; i < messages.length; i += 5) {
    chunks.push(messages.slice(i, i + 5));
  }

  let lastMessageId: string | null = null;

  for (const chunk of chunks) {
    try {
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: groupId, messages: chunk }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`LINE Group Message failed: ${response.status} ${errorBody}`);
        continue;
      }

      const resJson = await response.json().catch(() => ({}));
      const messageId =
        resJson.sentMessages && resJson.sentMessages.length > 0
          ? resJson.sentMessages[0].id
          : "";
      lastMessageId = messageId || "sent";

      const content = chunk
        .map((m) => (m.type === "text" ? m.text : `[${m.type}]`))
        .join("\n\n");

      await adminDb.collection("notificationHistorys").add({
        messageId,
        content,
        sentAt: new Date(),
        sourceCollection: historyMetadata.sourceCollection,
        sourceDocId: historyMetadata.sourceDocId,
        title: historyMetadata.title,
      });

      // lineNotificationLogs にも記録
      try {
        const now = new Date();
        const jstOffset = 9 * 60;
        const jstDate = new Date(now.getTime() + (jstOffset + now.getTimezoneOffset()) * 60000);
        const yyyy = jstDate.getFullYear();
        const MM = String(jstDate.getMonth() + 1).padStart(2, "0");
        const dd = String(jstDate.getDate()).padStart(2, "0");
        const HH = String(jstDate.getHours()).padStart(2, "0");
        const mm = String(jstDate.getMinutes()).padStart(2, "0");
        const ss = String(jstDate.getSeconds()).padStart(2, "0");
        const sentAtFormatted = `${yyyy}/${MM}/${dd} ${HH}:${mm}:${ss}`;
        const yearMonth = `${yyyy}-${MM}`;
        const dateStr = `${yyyy}-${MM}-${dd}`;

        const sanitizedMessages = chunk.map((m) => {
          if (m.type === "text") return { type: "text", text: m.text };
          if (m.type === "image") return { type: "image", originalContentUrl: m.originalContentUrl, previewImageUrl: m.previewImageUrl };
          return m;
        });

        await adminDb.collection("lineNotificationLogs").add({
          accountType: "group",
          accountName: "全体グループ通知",
          notificationType: historyMetadata.notificationType || (historyMetadata.sourceCollection === "accountingSeasons" ? "accounting" : "event"),
          notificationTitle: historyMetadata.title,
          recipientType: "group",
          recipientUid: "group",
          recipientName: "全体グループ (バンドLINE)",
          recipientLineId: groupId,
          messages: sanitizedMessages,
          messageCount: chunk.length,
          summary: content.length > 80 ? content.substring(0, 80) + "..." : content,
          status: "success",
          statusCode: response.status,
          sentAt: now.getTime(),
          sentAtFormatted,
          yearMonth,
          date: dateStr,
          sourceCollection: historyMetadata.sourceCollection,
          sourceDocId: historyMetadata.sourceDocId,
          details: { messageId },
        });
      } catch (logErr) {
        console.warn("Failed to write group message to lineNotificationLogs:", logErr);
      }
    } catch (err) {
      console.error("sendLineGroupMessage exception:", err);
    }
  }

  return lastMessageId;
}
