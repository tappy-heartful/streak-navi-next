"use server";

import { adminDb } from "@/src/lib/firebase-admin";
import { sendLinePushMessage } from "@/src/lib/line";
import { ExpenseApply, User, Prefecture, ExpenseApplyHistory } from "@/src/lib/firestore/types";
import { getMunicipalityNamesMapServer } from "../../users/api/user-server-actions";

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

/**
 * 経費申請に関する通知 (申請者本人宛)
 */
export async function notifyExpenseApply(expenseId: string, action: 'create' | 'update' | 'delete') {
  try {
    const nowStr = formatJstDateTime(new Date());

    let expenseData: ExpenseApply | null = null;
    const doc = await adminDb.collection("expenseApplies").doc(expenseId).get();

    if (!doc.exists && action === 'delete') {
      const archSnap = await adminDb.collection("archives")
        .where("originalCollection", "==", "expenseApplies")
        .where("originalId", "==", expenseId)
        .orderBy("archivedAt", "desc")
        .limit(1)
        .get();
      if (!archSnap.empty) {
        expenseData = archSnap.docs[0].data() as ExpenseApply;
      }
    } else if (doc.exists) {
      expenseData = doc.data() as ExpenseApply;
    }

    if (!expenseData) return;

    let text = "";
    if (action === 'delete') {
      text = `お疲れ様です！Streak Navi コンシェルジュです🍀\n`;
      text += `申請されていた経費の取り下げ（削除）を承りました。\n\n`;
      text += `【削除された内容】\n`;
      text += `項目: ${expenseData.name}\n`;
      text += `金額: ¥${expenseData.amount.toLocaleString()}\n`;
      text += `操作日時: ${nowStr}\n`;
    } else {
      const actionLabel = action === 'create' ? "申請を承りました" : "申請内容の更新を承りました";
      text = `お疲れ様です！Streak Navi コンシェルジュです🍀\n`;
      text += `経費の${actionLabel}。内容をご確認ください。\n\n`;
      text += `【申請内容】\n`;
      text += `項目: ${expenseData.name}\n`;
      text += `金額: ¥${expenseData.amount.toLocaleString()}\n`;
      text += `日付: ${expenseData.date}\n`;
      text += `種別: ${expenseData.category || "不明"}\n`;
      if (expenseData.isEventRequired && expenseData.eventTitle) {
        text += `対象イベント: ${expenseData.eventTitle}\n`;
      }

      if (expenseData.isTravel) {
        const munIds = [];
        if (expenseData.departureMunicipalityId) munIds.push(expenseData.departureMunicipalityId);
        if (expenseData.arrivalMunicipalityId) munIds.push(expenseData.arrivalMunicipalityId);

        const [munMap, prefsSnap] = await Promise.all([
          getMunicipalityNamesMapServer(munIds),
          adminDb.collection("prefectures").get()
        ]);

        const prefs = prefsSnap.docs.map(d => ({ id: d.id, name: d.data().name }));
        const depPref = prefs.find(p => p.id === expenseData?.departurePrefectureId)?.name || "";
        const arrPref = prefs.find(p => p.id === expenseData?.arrivalPrefectureId)?.name || "";
        const depMun = munMap[expenseData.departureMunicipalityId || ""] || expenseData.departureMunicipalityId || "";
        const arrMun = munMap[expenseData.arrivalMunicipalityId || ""] || expenseData.arrivalMunicipalityId || "";

        text += `行程: ${depPref}${depMun} ⇔ ${arrPref}${arrMun}\n`;
      }

      text += `操作日時: ${nowStr}\n`;
      text += `\n▼ 詳細はこちらからご確認いただけます\n`;
      text += `${BASE_URL}/expense-apply/confirm?expenseId=${expenseId}`;
    }

    if (expenseData.files && expenseData.files.length > 0) {
      text += `\n\n▼ 添付ファイル:\n`;
      expenseData.files.forEach(file => {
        text += `・${file.name}\n${file.url}\n\n`;
      });
    }

    const messages: any[] = [{ type: "text", text }];

    const lineDoc = await adminDb.collection("lineMessagingIds").doc(expenseData.uid).get();
    if (lineDoc.exists && lineDoc.data()?.lineUid) {
      await sendLinePushMessage(lineDoc.data()?.lineUid, messages);
    }
  } catch (e) {
    console.error("notifyExpenseApply failed", e);
  }
}

/**
 * 経費審査に関する通知 (申請者宛)
 */
export async function notifyExpenseReview(expenseId: string, status: 'approved' | 'returned' | 'pending') {
  try {
    const nowStr = formatJstDateTime(new Date());

    const doc = await adminDb.collection("expenseApplies").doc(expenseId).get();
    if (!doc.exists) return;
    const expenseData = doc.data() as ExpenseApply;

    let text = `お疲れ様です！Streak Navi コンシェルジュです🍀\n\n`;

    if (status === 'approved') {
      text += `経費申請が承認されました ✅\n\n`;
      text += `【承認内容】\n`;
      text += `項目: ${expenseData.name}\n`;
      text += `金額: ¥${expenseData.amount.toLocaleString()}\n`;
      text += `承認日時: ${nowStr}\n`;
      if (expenseData.adminComment) {
        text += `\n▼ 会計担当からのコメント:\n${expenseData.adminComment}\n`;
      }
    } else if (status === 'returned') {
      text += `経費申請が差し戻しになりました 🔄\n`;
      text += `内容を確認・修正のうえ、再申請をお願いします🙇\n\n`;
      text += `【対象申請】\n`;
      text += `項目: ${expenseData.name}\n`;
      text += `金額: ¥${expenseData.amount.toLocaleString()}\n`;
      text += `差し戻し日時: ${nowStr}\n`;
      if (expenseData.adminComment) {
        text += `\n▼ 差し戻し理由:\n${expenseData.adminComment}\n`;
      }
    } else {
      // pending（審査待ちに戻す）= 管理者の操作ミス修正
      text += `経費申請が審査待ちに戻されました ⏳\n\n`;
      text += `【対象申請】\n`;
      text += `項目: ${expenseData.name}\n`;
      text += `金額: ¥${expenseData.amount.toLocaleString()}\n`;
      if (expenseData.adminComment) {
        text += `\n▼ コメント:\n${expenseData.adminComment}\n`;
      }
    }

    text += `\n▼ 詳細はこちらからご確認いただけます\n`;
    text += `${BASE_URL}/expense-apply/confirm?expenseId=${expenseId}`;

    const messages = [{ type: "text", text }];

    const lineDoc = await adminDb.collection("lineMessagingIds").doc(expenseData.uid).get();
    if (lineDoc.exists && lineDoc.data()?.lineUid) {
      await sendLinePushMessage(lineDoc.data()?.lineUid, messages);
    }
  } catch (e) {
    console.error("notifyExpenseReview failed", e);
  }
}
