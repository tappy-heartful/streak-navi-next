/**
 * LINE Messaging API ユーティリティ (Server-only)
 */
import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";

export async function sendLinePushMessage(
  to: string,
  messages: any[],
  historyMetadata?: {
    sourceCollection: string;
    sourceDocId: string;
    title: string;
  }
) {
  const token = process.env.LINE_INDIV_ACCESS_TOKEN;
  if (!token) {
    console.warn("LINE_INDIV_ACCESS_TOKEN is not set. Skipping notification.");
    return;
  }

  // LINE APIは最大5つのメッセージまで一度に送れる
  // 5つを超える場合は分割して送る必要がある
  const chunks = [];
  for (let i = 0; i < messages.length; i += 5) {
    chunks.push(messages.slice(i, i + 5));
  }

  for (const chunk of chunks) {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, messages: chunk }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`LINE Message failed: ${response.status} ${errorBody}`);
      // ここでは例外を投げずログ出力に留める（通知失敗で本体の処理を止めたくないため）
    } else {
      if (historyMetadata) {
        try {
          const resJson = await response.json().catch(() => ({}));
          const messageId =
            resJson.sentMessages && resJson.sentMessages.length > 0
              ? resJson.sentMessages[0].id
              : "";

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

          // LINE送信履歴 (lineNotificationLogs) にも保存
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
              notificationType: historyMetadata.sourceCollection === "issues" ? "todo" : historyMetadata.sourceCollection === "accounting" ? "accounting" : "other",
              notificationTitle: historyMetadata.title,
              recipientType: "individual",
              recipientUid: to,
              recipientName: "メンバー",
              recipientLineId: to,
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
        } catch (dbErr) {
          console.error("Failed to save line notification history", dbErr);
        }
      }
    }
  }
}
