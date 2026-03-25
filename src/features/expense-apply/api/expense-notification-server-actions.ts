"use server";

import { adminDb } from "@/src/lib/firebase-admin";
import { sendLinePushMessage } from "@/src/lib/line";
import { ExpenseApply, User, Prefecture, ExpenseApplyHistory } from "@/src/lib/firestore/types";
import { getMunicipalityNamesMapServer } from "../../users/api/user-server-actions";

/**
 * 経費申請に関する通知 (申請者本人宛)
 */
export async function notifyExpenseApply(expenseId: string, action: 'create' | 'update' | 'delete') {
  try {
    // 申請データの取得 (削除の場合はアーカイブから取得するか、事前に渡されたデータを使う必要があるが、
    // ここでは事後通知を想定してアーカイブまたは通常のドキュメントを確認)
    let expenseData: ExpenseApply | null = null;
    const doc = await adminDb.collection("expenseApplies").doc(expenseId).get();
    
    if (!doc.exists && action === 'delete') {
      // 削除済みの場合はアーカイブを直近1件探す (簡易的)
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

    // 関連データの取得
    const applicant = await adminDb.collection("users").doc(expenseData.uid).get();

    const applicantName = applicant.exists ? (applicant.data() as any).displayName : "不明";
    const actionLabel = action === 'create' ? "新規作成" : action === 'update' ? "更新" : "削除";

    // メッセージ構築
    let text = `【経費申請: ${actionLabel}】\n`;
    text += `申請者: ${applicantName}様\n`;
    text += `項目: ${expenseData.name}\n`;
    text += `金額: ¥${expenseData.amount.toLocaleString()}\n`;
    text += `日付: ${expenseData.date}\n`;
    text += `種別: ${expenseData.category || "不明"}\n`;

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

    const messages: any[] = [{ type: "text", text }];

    // 画像があれば追加 (最大5メッセージの制限に注意)
    if (expenseData.files && expenseData.files.length > 0) {
      expenseData.files.slice(0, 4).forEach(file => {
        if (file.url.match(/\.(jpeg|jpg|png|gif)/i) || file.url.includes("image")) {
          messages.push({
            type: "image",
            originalContentUrl: file.url,
            previewImageUrl: file.url
          });
        }
      });
    }

    // 申請者本人に送信
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
export async function notifyExpenseReview(expenseId: string, status: 'approved' | 'rejected' | 'pending') {
  try {
    const doc = await adminDb.collection("expenseApplies").doc(expenseId).get();
    if (!doc.exists) return;
    const expenseData = doc.data() as ExpenseApply;

    const statusLabel = status === 'approved' ? "承認 ✅" : status === 'rejected' ? "否認 ❌" : "審査待ち(戻し) ⏳";
    let text = `【経費審査結果のお知らせ】\n`;
    text += `状態: ${statusLabel}\n`;
    text += `項目: ${expenseData.name}\n`;
    text += `金額: ¥${expenseData.amount.toLocaleString()}\n`;
    
    if (expenseData.adminComment) {
      text += `\nコメント:\n${expenseData.adminComment}`;
    }

    text += `\n\n詳細はアプリでご確認ください。`;

    const messages = [{ type: "text", text }];

    // 申請者のLINE IDを取得
    const lineDoc = await adminDb.collection("lineMessagingIds").doc(expenseData.uid).get();
    if (lineDoc.exists && lineDoc.data()?.lineUid) {
      await sendLinePushMessage(lineDoc.data()?.lineUid, messages);
    }
  } catch (e) {
    console.error("notifyExpenseReview failed", e);
  }
}
