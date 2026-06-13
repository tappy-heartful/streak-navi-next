"use server";

import { adminDb } from "@/src/lib/firebase-admin";
import { sendLinePushMessage } from "@/src/lib/line";
import { Issue } from "@/src/lib/firestore/types";

const BASE_URL = "https://streak-navi.vercel.app";

/**
 * 日時を JST 形式でフォーマット (yyyy/MM/dd HH:mm)
 */
function formatJstDateTime(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  todo: "TODO",
  bug: "課題",
  question: "質問",
  proposal: "提案",
  request: "要望",
};

const ISSUE_STATUS_LABELS: Record<string, string> = {
  not_started: "未着手",
  in_progress: "着手中",
  completed: "完了",
};

/**
 * TODO・課題・質問などのイシュー操作に関するLINE通知を起票者と担当者に送信する（操作した本人は除く）
 */
export async function notifyIssueAction(
  issueId: string,
  action: "create" | "update" | "comment",
  actorId: string,
  payload?: { commentText?: string; actorName?: string }
) {
  try {
    const nowStr = formatJstDateTime(new Date());

    const doc = await adminDb.collection("issues").doc(issueId).get();
    if (!doc.exists) return;
    const issueData = doc.data() as Issue;

    const typeLabel = ISSUE_TYPE_LABELS[issueData.type] || issueData.type;
    const statusLabel = ISSUE_STATUS_LABELS[issueData.status] || issueData.status;

    let text = "お疲れ様です！Streak Navi コンシェルジュです🍀\n";

    if (action === "create") {
      text += `新しい${typeLabel}が起票されました。内容をご確認ください。\n\n`;
      text += `【起票内容】\n`;
      text += `区分: ${typeLabel}\n`;
      text += `タイトル: ${issueData.title}\n`;
      text += `担当者: ${issueData.assigneeName || "未設定"}\n`;
      if (issueData.date) {
        text += `期限/日付: ${issueData.date} (${issueData.dateType === "until" ? "まで" : "に"})\n`;
      }
      text += `起票者: ${issueData.createdByName || "不明"}\n`;
      if (issueData.description) {
        const descPreview = issueData.description.length > 150
          ? issueData.description.substring(0, 150) + "..."
          : issueData.description;
        text += `説明:\n${descPreview}\n`;
      }
    } else if (action === "update") {
      text += `${typeLabel}情報が更新されました。内容をご確認ください。\n\n`;
      text += `【更新内容】\n`;
      text += `区分: ${typeLabel}\n`;
      text += `タイトル: ${issueData.title}\n`;
      text += `担当者: ${issueData.assigneeName || "未設定"}\n`;
      text += `ステータス: ${statusLabel}\n`;
      if (issueData.date) {
        text += `期限/日付: ${issueData.date} (${issueData.dateType === "until" ? "まで" : "に"})\n`;
      }
      text += `起票者: ${issueData.createdByName || "不明"}\n`;
      if (issueData.description) {
        const descPreview = issueData.description.length > 150
          ? issueData.description.substring(0, 150) + "..."
          : issueData.description;
        text += `説明:\n${descPreview}\n`;
      }
    } else if (action === "comment") {
      text += `${typeLabel}に新しいコメントが投稿されました。\n\n`;
      text += `【コメント対象】\n`;
      text += `区分: ${typeLabel}\n`;
      text += `タイトル: ${issueData.title}\n`;
      text += `担当者: ${issueData.assigneeName || "未設定"}\n\n`;
      text += `【投稿されたコメント】\n`;
      text += `投稿者: ${payload?.actorName || "不明"}\n`;
      text += `コメント:\n${payload?.commentText || ""}\n`;
    }

    text += `\n操作日時: ${nowStr}\n`;
    text += `\n▼ 詳細はこちらからご確認いただけます\n`;
    text += `${BASE_URL}/issue/confirm?issueId=${issueId}`;

    const messages = [{ type: "text", text }];

    // 起票者と担当者を取得（重複を排除し、かつ操作した本人を排除）
    const targetUids = Array.from(
      new Set([issueData.createdBy, issueData.assigneeId].filter(Boolean))
    ).filter((uid) => uid !== actorId);

    for (const uid of targetUids) {
      const lineDoc = await adminDb.collection("lineMessagingIds").doc(uid).get();
      if (lineDoc.exists && lineDoc.data()?.lineUid) {
        await sendLinePushMessage(lineDoc.data()?.lineUid, messages);
      }
    }
  } catch (e) {
    console.error("notifyIssueAction failed", e);
  }
}
