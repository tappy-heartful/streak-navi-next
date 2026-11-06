import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";
import { sendLinePushMessage, sendLineGroupMessage } from "@/src/lib/line";
import { calculateBalanceAccounting, getSeasonPeriod } from "@/src/features/accounting/lib/accounting-calculator";
import { getJSTDate, format } from "@/src/lib/functions";
import { AccountingSeason, AccountingSeasonKey, User } from "@/src/lib/firestore/types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://streak-navi.vercel.app";
const REMIND_INTERVAL_DAYS = 7;

// 旅費・スタジオ代 定数ID
const TRAVEL_TYPE_ID = "fiUBTSW4SEGBfQlcisGh";
const TRAVEL_CATEGORY_ID = "A9cSS41gjVwsGNWhwbGw";
const TRAVEL_ITEM_ID = "bMLkvqIclyWwVJl0qydm";

const STUDIO_TYPE_ID = "fiUBTSW4SEGBfQlcisGh";
const STUDIO_CATEGORY_ID = "YgrT3vCEkoYC88ZDFeWo";
const STUDIO_ITEM_ID = "CvkhOp2UV0chRO4dlbL8";

export interface DailyCronResult {
  success: boolean;
  timestamp: string;
  isForce: boolean;
  autoNoticeCount: number;
  seasonNoticeSent: boolean;
  yesterdayEventNoticeCount: number;
  todoNoticeCount: number;
  travelSubsidyNoticeCount: number;
  accountingRemindCount: number;
  logs: string[];
}

/**
 * 日次定期通知タスク一括実行（朝/昼）
 */
export async function runDailyCronTasks(isForce = false): Promise<DailyCronResult> {
  const nowJst = getJSTDate();
  const todayStr = format(nowJst, "yyyy.MM.dd");
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[DailyCron] ${msg}`);
    logs.push(msg);
  };

  log(`日次定期通知処理を開始します (基準日: ${todayStr}, isForce: ${isForce})`);

  let autoNoticeCount = 0;
  let seasonNoticeSent = false;
  let yesterdayEventNoticeCount = 0;
  let todoNoticeCount = 0;
  let travelSubsidyNoticeCount = 0;
  let accountingRemindCount = 0;

  // 1. イベント・投票・曲募集の案内 (全体LINE)
  try {
    log("--- 1. イベント・投票・曲募集の案内処理開始 ---");
    autoNoticeCount = await execAutoNotification(todayStr, isForce, log);
  } catch (err: any) {
    log(`❌ execAutoNotification エラー: ${err.message}`);
  }

  // 2. 会計シーズン終了翌日 (1/1, 4/1, 7/1, 10/1) の全体清算案内 (全体LINE)
  try {
    log("--- 2. 会計シーズン清算案内処理開始 ---");
    seasonNoticeSent = await execSeasonSettlementNotice(nowJst, isForce, log);
  } catch (err: any) {
    log(`❌ execSeasonSettlementNotice エラー: ${err.message}`);
  }

  // 3. 昨日行われたイベントの経費申請・旅費補助案内 (全体LINE)
  try {
    log("--- 3. 昨日イベントの経費・旅費補助案内処理開始 ---");
    yesterdayEventNoticeCount = await execYesterdayEventNotice(nowJst, isForce, log);
  } catch (err: any) {
    log(`❌ execYesterdayEventNotice エラー: ${err.message}`);
  }

  // 4. TODO期限前・超過リマインド (個別LINE)
  try {
    log("--- 4. TODO期限リマインド処理開始 ---");
    todoNoticeCount = await execTodoDeadlineNotification(todayStr, isForce, log);
  } catch (err: any) {
    log(`❌ execTodoDeadlineNotification エラー: ${err.message}`);
  }

  // 5. 旅費補助未提出リマインド (個別LINE)
  try {
    log("--- 5. 旅費補助未提出リマインド処理開始 ---");
    travelSubsidyNoticeCount = await execPendingTravelSubsidyNotification(nowJst, isForce, log);
  } catch (err: any) {
    log(`❌ execPendingTravelSubsidyNotification エラー: ${err.message}`);
  }

  // 6. 会計精算未入金・受取証跡リマインド (個別LINE) ★共通計算ロジック使用
  try {
    log("--- 6. 会計精算リマインド処理開始 ---");
    accountingRemindCount = await execAccountingRemindNotification(nowJst, isForce, log);
  } catch (err: any) {
    log(`❌ execAccountingRemindNotification エラー: ${err.message}`);
  }

  log("日次定期通知処理が正常に完了しました。");

  return {
    success: true,
    timestamp: new Date().toISOString(),
    isForce,
    autoNoticeCount,
    seasonNoticeSent,
    yesterdayEventNoticeCount,
    todoNoticeCount,
    travelSubsidyNoticeCount,
    accountingRemindCount,
    logs,
  };
}

/**
 * 1. イベント・投票・曲募集の案内 (全体LINE)
 */
async function execAutoNotification(todayStr: string, isForce: boolean, log: (m: string) => void): Promise<number> {
  const configDoc = await adminDb.collection("configs").doc("noticeBase").get();
  if (!configDoc.exists) {
    log("通知設定(configs/noticeBase)が見つかりません。スキップします。");
    return 0;
  }
  const config = configDoc.data() || {};
  let sentCount = 0;

  const getTargetUrl = (colName: string, docId: string) => {
    switch (colName) {
      case "events": return `${BASE_URL}/event/confirm?eventId=${docId}`;
      case "votes": return `${BASE_URL}/vote/confirm?voteId=${docId}`;
      case "calls": return `${BASE_URL}/call/confirm?callId=${docId}`;
      default: return BASE_URL;
    }
  };

  const evaluateAndSend = async (
    colName: string,
    docs: FirebaseFirestore.QueryDocumentSnapshot[],
    dateField: string,
    settings: any[],
    attendanceTypeFilter?: string
  ) => {
    if (!settings || settings.length === 0) return;

    // 設定から対象日付マップを構築
    const targetDateMap: Record<string, string[]> = {};
    settings.forEach(s => {
      const targetDate = new Date(todayStr.replace(/\./g, "/"));
      const offset = s.beforeAfter === "before" ? Number(s.days || 0) : -Number(s.days || 0);
      targetDate.setDate(targetDate.getDate() + offset);
      const dStr = format(targetDate, "yyyy.MM.dd");
      if (!targetDateMap[dStr]) targetDateMap[dStr] = [];
      targetDateMap[dStr].push(s.message);
    });

    for (const doc of docs) {
      const data = doc.data();
      const docId = doc.id;

      if (attendanceTypeFilter && data.attendanceType !== attendanceTypeFilter) continue;
      if (data.isAcceptingResponses === false) continue;

      const contentDate = data[dateField];
      if ((contentDate && targetDateMap[contentDate]) || isForce) {
        const displayDate = data.date || data.targetDate || "";
        const title = data.title || data.name || "名称未設定";
        const url = getTargetUrl(colName, docId);
        const messagesToSend = (contentDate && targetDateMap[contentDate]) ? targetDateMap[contentDate] : (settings[0]?.message ? [settings[0].message] : ["ご案内です"]);

        for (const msg of messagesToSend) {
          const fullMessage = `お疲れ様です！\n\n${msg}\n\n⭐${displayDate ? displayDate + "\n" : ""}${title}\n${url}`;
          const messageId = await sendLineGroupMessage(
            [{ type: "text", text: fullMessage }],
            {
              sourceCollection: colName,
              sourceDocId: docId,
              title: `${title} 自動案内`,
              notificationType: colName === "events" ? "event" : colName === "votes" ? "vote" : "call",
            }
          );
          if (messageId) {
            sentCount++;
            log(`[全体案内] 送信完了: ${colName}/${docId} (${title})`);
          }
        }
      }
    }
  };

  const [eventsSnap, votesSnap, callsSnap] = await Promise.all([
    adminDb.collection("events").get(),
    adminDb.collection("votes").get(),
    adminDb.collection("calls").get(),
  ]);

  if (!eventsSnap.empty) {
    await evaluateAndSend("events", eventsSnap.docs, "acceptStartDate", config.eventStartNotifications, "attendance");
    await evaluateAndSend("events", eventsSnap.docs, "acceptEndDate", config.eventEndNotifications, "attendance");
    await evaluateAndSend("events", eventsSnap.docs, "acceptStartDate", config.eventAdjStartNotifications, "schedule");
    await evaluateAndSend("events", eventsSnap.docs, "acceptEndDate", config.eventAdjEndNotifications, "schedule");
  }

  if (!votesSnap.empty) {
    await evaluateAndSend("votes", votesSnap.docs, "acceptStartDate", config.voteStartNotifications);
    await evaluateAndSend("votes", votesSnap.docs, "acceptEndDate", config.voteEndNotifications);
  }

  if (!callsSnap.empty) {
    await evaluateAndSend("calls", callsSnap.docs, "acceptStartDate", config.callStartNotifications);
    await evaluateAndSend("calls", callsSnap.docs, "acceptEndDate", config.callEndNotifications);
  }

  return sentCount;
}

/**
 * 2. 会計シーズン終了翌日 (1/1, 4/1, 7/1, 10/1) の全体清算案内 (全体LINE)
 */
async function execSeasonSettlementNotice(nowJst: Date, isForce: boolean, log: (m: string) => void): Promise<boolean> {
  const month = nowJst.getUTCMonth() + 1;
  const date = nowJst.getUTCDate();
  const currentYear = nowJst.getUTCFullYear();

  // 四半期初日 (1/1, 4/1, 7/1, 10/1) または isForce の場合に前シーズンの案内を送信
  let targetYear = currentYear;
  let targetSeasonKey: AccountingSeasonKey = "winter";
  let targetSeasonName = "冬";

  if (month === 1 && (date === 1 || isForce)) {
    targetYear = currentYear - 1;
    targetSeasonKey = "autumn";
    targetSeasonName = "秋";
  } else if (month === 4 && (date === 1 || isForce)) {
    targetYear = currentYear;
    targetSeasonKey = "winter";
    targetSeasonName = "冬";
  } else if (month === 7 && (date === 1 || isForce)) {
    targetYear = currentYear;
    targetSeasonKey = "spring";
    targetSeasonName = "春";
  } else if (month === 10 && (date === 1 || isForce)) {
    targetYear = currentYear;
    targetSeasonKey = "summer";
    targetSeasonName = "夏";
  } else if (!isForce) {
    log(`本日は ${month}/${date} のため、四半期初日清算案内の対象日ではありません。`);
    return false;
  }

  const seasonId = `${targetYear}-${targetSeasonKey}`;
  const seasonDoc = await adminDb.collection("accountingSeasons").doc(seasonId).get();
  const season = seasonDoc.exists ? (seasonDoc.data() as AccountingSeason) : null;

  let managerName = "";
  let managerPaypayId = "";
  if (season?.managerId) {
    const userDoc = await adminDb.collection("users").doc(season.managerId).get();
    if (userDoc.exists) {
      const u = userDoc.data() as User;
      managerName = u.displayName || "";
      managerPaypayId = u.paypayId || "";
    }
  }

  const managerGuide = managerName ? `シーズン担当（${managerName}さん）` : "シーズン清算担当者";
  const paypayGuide = managerPaypayId ? `\n   ※担当者PayPay ID: ${managerPaypayId}` : "";

  const message = `お疲れ様です！Streak Navi コンシェルジュです🍀\n\n` +
    `【バランス会計・${targetSeasonName}シーズン 清算のお願い】\n` +
    `前シーズン（${targetSeasonName}シーズン）の会計期間が終了しました！\n` +
    `参加メンバーの皆様は、以下のリンクより各自の精算額をご確認のうえ、清算手続きをお願いいたします。🙇‍♂️\n\n` +
    `⚠️ 清算期限: ${month}月7日まで ⚠️\n\n` +
    `▼ バランス会計確認画面はこちら\n` +
    `${BASE_URL}/accounting/confirm?seasonId=${seasonId}\n\n` +
    `ーーーーーーーーーーーーーー\n` +
    `【清算・送金の手順】\n` +
    `① 上記リンクを開き、ご自身の「精算額（支払 または 受取）」を確認\n` +
    `②「支払」の方：\n` +
    `   PayPayアプリの「送る」より、${managerGuide}へ精算額を送金してください${paypayGuide}\n` +
    `③「受取」の方：\n` +
    `   担当者からの送金をお待ちください（送金が完了すると画面に反映されます）\n` +
    `ーーーーーーーーーーーーーー`;

  const messageId = await sendLineGroupMessage(
    [{ type: "text", text: message }],
    {
      sourceCollection: "accountingSeasons",
      sourceDocId: seasonId,
      title: `${targetSeasonName}シーズン 清算案内`,
      notificationType: "accounting",
    }
  );

  if (messageId) {
    log(`[シーズン清算案内] 送信完了: ${seasonId}`);
    return true;
  }
  return false;
}

/**
 * 3. 昨日行われたイベントの経費申請・旅費補助案内 (全体LINE)
 */
async function execYesterdayEventNotice(nowJst: Date, isForce: boolean, log: (m: string) => void): Promise<number> {
  const yesterday = new Date(nowJst.getTime());
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = format(yesterday, "yyyy.MM.dd");

  const eventsSnap = await adminDb.collection("events").get();
  const yesterdayEvents = eventsSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter(e => isForce || e.date === yesterdayStr);

  let sentCount = 0;
  for (const event of yesterdayEvents) {
    const eventId = event.id;
    const eventTitle = event.title || "イベント";
    const dateParts = (event.date || yesterdayStr).split(".");
    const dateStr = `${Number(dateParts[1])}/${Number(dateParts[2])}`;

    let munLine = "";
    if (event.prefectureId && event.municipalityId) {
      try {
        const [prefDoc, munDoc] = await Promise.all([
          adminDb.collection("prefectures").doc(event.prefectureId).get(),
          adminDb.collection("municipalities").doc(event.municipalityId).get(),
        ]);
        const prefName = prefDoc.data()?.name || "";
        const munName = munDoc.data()?.name || "";
        if (prefName && munName) {
          munLine = `\n※今回は${prefName}${munName}在住の方は対象外です`;
        }
      } catch (err) {
        console.warn("Location fetch error:", err);
      }
    }

    const message = `お疲れ様です、先日の${dateStr}の${eventTitle}お疲れ様でした🍀\n\n` +
      `ーーーーーーーーーーーーーー\n\n` +
      `案内が遅くなってしまいましたが、参加してくださった方は以下より旅費補助申請をお願いいたします${munLine}\n\n` +
      `⚠️シーズン内の旅費補助申請を忘れた場合、シーズン後のご自身への請求額が相対的に増えてしまいます。ご自身のため、お早めの申請をお願いします⚠️\n\n` +
      `▼ 今回の旅費補助申請はこちら\n` +
      `${BASE_URL}/expense-apply/edit?mode=new&typeId=${TRAVEL_TYPE_ID}&categoryId=${TRAVEL_CATEGORY_ID}&itemId=${TRAVEL_ITEM_ID}&eventId=${eventId}\n\n` +
      `ーーーーーーーーーーーーーー\n\n` +
      `なお、練習会場費（スタジオ代）などを立て替えてくださった方は、以下より申請をお願いいたします\n\n` +
      `▼ 練習会場費（スタジオ代）の申請はこちら\n` +
      `${BASE_URL}/expense-apply/edit?mode=new&typeId=${STUDIO_TYPE_ID}&categoryId=${STUDIO_CATEGORY_ID}&itemId=${STUDIO_ITEM_ID}&eventId=${eventId}\n\n` +
      `ーーーーーーーーーーーーーー\n\n` +
      `なお、「旅費補助額が設定されていません」のメッセージが出る場合、ユーザ情報編集画面より【居住都道府県 市区町村】を入力し、たぴまでご連絡ください🤲\n\n` +
      `▼ 居住都道府県、市区町村の登録はこちら\n` +
      `${BASE_URL}/user/edit\n\n` +
      `ーーーーーーーーーーーーーー\n\n` +
      `その他、会計や旅費補助の制度についてはこちらをご覧ください\n` +
      `${BASE_URL}/board/confirm?boardId=PcXZzb0pFhlL7DSCzpU3`;

    const messageId = await sendLineGroupMessage(
      [{ type: "text", text: message }],
      {
        sourceCollection: "events",
        sourceDocId: eventId,
        title: `${eventTitle} 旅費補助案内`,
        notificationType: "event",
      }
    );

    if (messageId) {
      sentCount++;
      log(`[昨日イベント案内] 送信完了: ${eventTitle}`);
    }
  }

  return sentCount;
}

/**
 * 4. TODO期限前・超過リマインド (個別LINE)
 */
async function execTodoDeadlineNotification(todayStr: string, isForce: boolean, log: (m: string) => void): Promise<number> {
  const issuesSnap = await adminDb.collection("issues").get();
  const activeTodos = issuesSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter(todo => todo.status !== "completed" && todo.date);

  const getStatusName = (s: string) => {
    switch (s) {
      case "not_started": return "未着手";
      case "in_progress": return "進行中";
      case "pending": return "保留";
      default: return s || "未着手";
    }
  };

  const getElapsedDays = (targetDateStr: string): number | null => {
    try {
      const today = new Date(todayStr.replace(/\./g, "/"));
      const target = new Date(targetDateStr.replace(/\./g, "/"));
      return Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  let sentCount = 0;
  for (const todo of activeTodos) {
    const elapsedDays = getElapsedDays(todo.date);
    if (elapsedDays === null) continue;

    let remindType = "";
    let isOverdue = false;

    if (elapsedDays === -7) {
      remindType = "7日前";
    } else if (elapsedDays === -3) {
      remindType = "3日前";
    } else if (elapsedDays === 0) {
      remindType = "当日";
    } else if (elapsedDays === 1) {
      remindType = "期限切れ翌日";
      isOverdue = true;
    } else if (elapsedDays > 1 && (elapsedDays - 1) % 7 === 0) {
      remindType = "期限切れ超過";
      isOverdue = true;
    } else if (isForce) {
      remindType = "テスト実行";
      isOverdue = elapsedDays > 0;
    }

    if (!remindType) continue;
    if (!todo.assigneeId) continue;

    const lineMsgDoc = await adminDb.collection("lineMessagingIds").doc(todo.assigneeId).get();
    const lineUid = lineMsgDoc.data()?.lineUid;
    if (!lineUid) continue;

    const dateTypeStr = todo.dateType === "until" ? "まで" : "に";
    let message = "";

    if (isOverdue) {
      message = `お疲れ様です！Streak Navi コンシェルジュです🍀\n\n` +
        `【TODO期限超過のリマインド】\n` +
        `担当として設定されているTODOが期限を超過しています。⚠️\n\n` +
        `■ タイトル: ${todo.title}\n` +
        `■ 期限日: ${todo.date} ${dateTypeStr} (期限を${elapsedDays}日過ぎています)\n` +
        `■ 状態: ${getStatusName(todo.status)}\n\n` +
        `進捗状況に変化がございましたら、お手数ですがアプリよりステータスの更新をお願いいたします。すでに完了している場合は、お早めにステータスを「実施済」に変更してください。\n\n` +
        `▼ TODOの確認・更新はこちら\n` +
        `${BASE_URL}/issue/confirm?issueId=${todo.id}\n\n` +
        `※本メッセージはTODOの期限日を基準に自動送信されています。`;
    } else {
      message = `お疲れ様です！Streak Navi コンシェルジュです🍀\n\n` +
        `【TODO期限前のリマインド】\n` +
        `担当として設定されているTODOの期限が${remindType === "当日" ? "本日" : (remindType === "3日前" ? "3日後" : "7日後")}となりましたので、お知らせいたします。\n\n` +
        `■ タイトル: ${todo.title}\n` +
        `■ 期限日: ${todo.date} ${dateTypeStr}\n` +
        `■ 状態: ${getStatusName(todo.status)}\n\n` +
        `進捗状況に変化がございましたら、お手数ですがアプリよりステータスの更新をお願いいたします。\n\n` +
        `▼ TODOの確認・更新はこちら\n` +
        `${BASE_URL}/issue/confirm?issueId=${todo.id}\n\n` +
        `※本メッセージはTODOの期限日を基準に自動送信されています。`;
    }

    const messageId = await sendLinePushMessage(
      lineUid,
      [{ type: "text", text: message }],
      {
        sourceCollection: "issues",
        sourceDocId: todo.id,
        title: `TODO: ${todo.title}`,
        notificationType: "todo",
        recipientUid: todo.assigneeId,
        recipientName: todo.assigneeName || "担当メンバー",
      }
    );

    if (messageId) {
      sentCount++;
      log(`[TODOリマインド] 送信完了:「${todo.title}」(担当者: ${todo.assigneeName || todo.assigneeId})`);
    }
  }

  return sentCount;
}

/**
 * 5. 旅費補助未提出リマインド (個別LINE)
 */
async function execPendingTravelSubsidyNotification(nowJst: Date, isForce: boolean, log: (m: string) => void): Promise<number> {
  const eventsSnap = await adminDb.collection("events").get();
  const pastEvents = eventsSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter(e => {
      if (!e.date) return false;
      const eDate = new Date(e.date.replace(/\./g, "/"));
      const diffDays = Math.floor((nowJst.getTime() - eDate.getTime()) / (1000 * 60 * 60 * 24));
      return isForce || (diffDays > 0 && diffDays % REMIND_INTERVAL_DAYS === 0);
    });

  if (pastEvents.length === 0) return 0;

  const [expensesSnap, usersSnap] = await Promise.all([
    adminDb.collection("expenseApplies").get(),
    adminDb.collection("users").get(),
  ]);

  const travelExpenses = expensesSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter(e => e.typeId === TRAVEL_TYPE_ID);

  const userMap: Record<string, string> = {};
  usersSnap.docs.forEach(d => {
    userMap[d.id] = d.data().displayName || "メンバー";
  });

  let sentCount = 0;

  for (const event of pastEvents) {
    const eventId = event.id;
    const eventTitle = event.title || "イベント";
    const dateParts = event.date.split(".");
    const dateStr = `${Number(dateParts[1])}/${Number(dateParts[2])}`;

    // 出席回答の取得
    const answersSnap = await adminDb.collection("eventAttendanceAnswers")
      .where("eventId", "==", eventId)
      .where("status", "==", "attending")
      .get();

    const attendingUids = answersSnap.docs.map(d => d.data().uid).filter(Boolean);

    for (const uid of attendingUids) {
      // 申請済みか確認
      const hasApplied = travelExpenses.some(e => e.eventId === eventId && e.uid === uid);
      if (hasApplied) continue;

      // 居住地確認
      const locDoc = await adminDb.collection("users").doc(uid).collection("private").doc("location").get();
      const userLoc = locDoc.data() || {};
      const isLocationUnregistered = !userLoc.prefectureId || !userLoc.municipalityId;

      if (!isLocationUnregistered && event.municipalityId && userLoc.municipalityId === event.municipalityId) {
        continue; // 開催地在住のため対象外
      }

      const lineMsgDoc = await adminDb.collection("lineMessagingIds").doc(uid).get();
      const lineUid = lineMsgDoc.data()?.lineUid;
      if (!lineUid) continue;

      let message = "";
      if (isLocationUnregistered) {
        message = `お疲れ様です！Streak Navi コンシェルジュです🍀\n\n` +
          `【登録情報（居住地）登録と旅費補助申請のお願い】\n` +
          `先日のイベント「${eventTitle}」（${dateStr}）について出席と回答されていますが、旅費補助の申請が未提出です。⚠️\n\n` +
          `現在、旅費補助額の計算に必要な「居住都道府県」または「市区町村」の情報が未登録となっております。\n` +
          `まずは以下のプロフィール編集画面より、居住地をご登録ください🤲\n` +
          `（※イベント開催市区町村と同じ在住の方は申請対象外となりますが、登録がない場合は自動判定ができないため、ご登録をお願いいたします）\n\n` +
          `▼ 居住地（都道府県・市区町村）の登録はこちら\n` +
          `${BASE_URL}/user/edit\n\n` +
          `▼ 旅費補助申請はこちら\n` +
          `${BASE_URL}/expense-apply/edit?mode=new&typeId=${TRAVEL_TYPE_ID}&categoryId=${TRAVEL_CATEGORY_ID}&itemId=${TRAVEL_ITEM_ID}&eventId=${eventId}`;
      } else {
        message = `お疲れ様です！Streak Navi コンシェルジュです🍀\n\n` +
          `【旅費補助申請のリマインド】\n` +
          `先日のイベント「${eventTitle}」（${dateStr}）について、出席と回答されていますが、旅費補助の申請が未提出のようです。⚠️\n\n` +
          `※イベント開催場所（市区町村）に居住されている方は申請対象外となりますが、対象の方は以下のリンクよりお早めに申請をお願いいたします🤲\n\n` +
          `▼ 旅費補助申請はこちら\n` +
          `${BASE_URL}/expense-apply/edit?mode=new&typeId=${TRAVEL_TYPE_ID}&categoryId=${TRAVEL_CATEGORY_ID}&itemId=${TRAVEL_ITEM_ID}&eventId=${eventId}\n\n` +
          `▼ 登録情報（居住地）の確認・変更はこちら\n` +
          `${BASE_URL}/user/edit`;
      }

      const messageId = await sendLinePushMessage(
        lineUid,
        [{ type: "text", text: message }],
        {
          sourceCollection: "events",
          sourceDocId: eventId,
          title: `${eventTitle} 旅費補助催促`,
          notificationType: "accounting",
          recipientUid: uid,
          recipientName: userMap[uid] || "メンバー",
        }
      );

      if (messageId) {
        sentCount++;
        log(`[旅費補助催促] 送信完了: ${userMap[uid] || uid} (${eventTitle})`);
      }
    }
  }

  return sentCount;
}

/**
 * 6. 会計精算未入金・受取証跡リマインド (個別LINE) ★共通計算ロジック＋金額・送金担当者付き！
 */
async function execAccountingRemindNotification(nowJst: Date, isForce: boolean, log: (m: string) => void): Promise<number> {
  const seasonsSnap = await adminDb.collection("accountingSeasons").get();
  if (seasonsSnap.empty) return 0;

  const usersSnap = await adminDb.collection("users").get();
  const userMap: Record<string, User> = {};
  usersSnap.docs.forEach(d => {
    userMap[d.id] = { id: d.id, ...d.data() } as User;
  });

  let sentCount = 0;

  for (const doc of seasonsSnap.docs) {
    const s = doc.data() as AccountingSeason;
    const period = getSeasonPeriod(s.year, s.seasonKey);
    const endDateStr = s.endDate || period?.end;
    if (!endDateStr || !period) continue;

    const endDate = new Date(endDateStr.replace(/\./g, "/"));
    const diffDays = Math.floor((nowJst.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

    // 終了日を過ぎており、7日ごとのサイクル または isForce
    if (!isForce && (diffDays <= 0 || diffDays % REMIND_INTERVAL_DAYS !== 0)) {
      continue;
    }

    const memberIds = s.memberIds || [];
    if (memberIds.length === 0) continue;

    // 経費・収入の取得
    const [expensesSnap, incomesSnap] = await Promise.all([
      adminDb.collection("expenseApplies")
        .where("status", "==", "approved")
        .where("date", ">=", period.start)
        .where("date", "<=", period.end)
        .get(),
      adminDb.collection("incomes")
        .where("date", ">=", period.start)
        .where("date", "<=", period.end)
        .get(),
    ]);

    const expenses = expensesSnap.docs.map(d => d.data() as any);
    const incomes = incomesSnap.docs.map(d => d.data() as any);

    // ★共通ロジックで計算！
    const { memberCalculations } = calculateBalanceAccounting(memberIds, expenses, incomes);

    // 送金担当者情報
    const managerUser = s.managerId ? userMap[s.managerId] : null;
    const managerName = managerUser?.displayName || "会計担当者";
    const managerPaypayId = managerUser?.paypayId || "";

    const pendingReceivers: string[] = [];

    // 1. 支払い対象メンバーへの未払い催促
    for (const uid of memberIds) {
      if (uid === s.managerId) continue;

      const calc = memberCalculations[uid];
      if (!calc) continue;

      const hasEvidence = !!s.evidenceUrls?.[uid]?.trim();
      if (hasEvidence) continue;

      if (calc.isPayer) {
        // 支払いが必要な未払いメンバー
        const lineMsgDoc = await adminDb.collection("lineMessagingIds").doc(uid).get();
        const lineUid = lineMsgDoc.data()?.lineUid;
        if (!lineUid) continue;

        const paypayDisplay = managerPaypayId ? ` (PayPay ID: ${managerPaypayId})` : "";
        const message = `お疲れ様です！Streak Navi コンシェルジュです🍀\n\n` +
          `【バランス会計・お支払いのお願い】\n` +
          `「${s.name}」の未払い分（未清算）がございます。⚠️\n` +
          `金額をご確認のうえ、送金担当者への送金をお願いいたします。🙇‍♂️\n\n` +
          `■ お支払い金額: ¥${calc.settlementAmount.toLocaleString()}\n` +
          `■ 送金担当者: ${managerName} さん${paypayDisplay}\n\n` +
          `▼ バランス会計の確認はこちら\n` +
          `${BASE_URL}/accounting/confirm?seasonId=${s.id}`;

        const messageId = await sendLinePushMessage(
          lineUid,
          [{ type: "text", text: message }],
          {
            sourceCollection: "accountingSeasons",
            sourceDocId: s.id,
            title: `${s.name} 精算リマインド`,
            notificationType: "accounting",
            recipientUid: uid,
            recipientName: userMap[uid]?.displayName || "メンバー",
          }
        );

        if (messageId) {
          sentCount++;
          log(`[会計精算リマインド] 支払催促送信完了: ${userMap[uid]?.displayName || uid} (金額: ¥${calc.settlementAmount.toLocaleString()}, 担当: ${managerName})`);
        }
      } else if (calc.isReceiver) {
        pendingReceivers.push(uid);
      }
    }

    // 2. 送金担当者（Manager）への受取証跡アップロードのお願い
    if (s.managerId && pendingReceivers.length > 0) {
      const lineMsgDoc = await adminDb.collection("lineMessagingIds").doc(s.managerId).get();
      const managerLineUid = lineMsgDoc.data()?.lineUid;

      if (managerLineUid) {
        const receiverNames = pendingReceivers
          .map(uid => userMap[uid]?.displayName || "メンバー")
          .slice(0, 5)
          .join("、");
        const etcText = pendingReceivers.length > 5 ? ` ほか計${pendingReceivers.length}名` : "";

        const managerMessage = `お疲れ様です！Streak Navi コンシェルジュです🍀\n\n` +
          `【バランス会計・受取証跡アップロードのお願い】\n` +
          `「${s.name}」について、送金完了後の受取証明（スクショ）が未提出のメンバーがいます。\n` +
          `（対象: ${receiverNames}${etcText}）\n\n` +
          `以下の画面より送金状況をご確認のうえ、送金およびスクショのアップロードをお願いいたします。🙇‍♂️\n\n` +
          `▼ バランス会計確認・スクショアップロードはこちら\n` +
          `${BASE_URL}/accounting/confirm?seasonId=${s.id}`;

        const mId = await sendLinePushMessage(
          managerLineUid,
          [{ type: "text", text: managerMessage }],
          {
            sourceCollection: "accountingSeasons",
            sourceDocId: s.id,
            title: `${s.name} 受取証跡アップロードお願い`,
            notificationType: "accounting",
            recipientUid: s.managerId,
            recipientName: managerName,
          }
        );

        if (mId) {
          sentCount++;
          log(`[会計精算リマインド] 担当者への受取証跡催促送信完了: ${managerName}`);
        }
      }
    }
  }

  return sentCount;
}
