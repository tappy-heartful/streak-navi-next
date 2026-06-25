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
        } catch (dbErr) {
          console.error("Failed to save line notification history", dbErr);
        }
      }
    }
  }
}
