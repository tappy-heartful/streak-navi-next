/**
 * ==============================================================================
 * STREAK NAVI 統合自動運用スクリプト (StreakNavi_Integrated_Bot.js)
 * ==============================================================================
 *
 * 【概要】
 * これまで複数に分かれていた以下のBOT機能を1つのスクリプトに一本化しました。
 * 1. 【Navi_01】AutoNotice_LINE_Bot: イベント出欠・日程調整・投票・曲募集の案内 (全体LINE)
 * 2. 【Navi_02】Accounting_Bot:
 *    - 昨日イベントの経費・旅費補助申請案内 (全体LINE)
 *    - TODO期限前・超過リマインド (個別LINE)
 *    - 旅費補助未提出リマインド (個別LINE)
 *    - 会計精算未入金・未証跡リマインド (個別LINE)
 *    - 新会計シーズンの自動作成 (四半期初日判定)
 * 3. 【Navi_03】Todo_Bot: TODO期限通知 (個別LINE)
 * 4. 【Navi_99】Clean_All_Old_Logs_Bot: 古いログの定期クリーンアップ (1,000件超過分削除)
 *
 * ------------------------------------------------------------------------------
 * 【設定するトリガー（2つ）】
 * 1. runDailyNotifications  : 【昼/朝実行】毎日 9:00〜10:00 または 12:00〜13:00（時間主導型）
 * 2. runNightlyMaintenance  : 【夜/深夜実行】毎日 0:00〜1:00 または 23:00〜0:00（時間主導型）
 *
 * 【設定するスクリプトプロパティ（合計6つ）】
 * - FIRESTORE_EMAIL         : Firebase サービスアカウントのクライアントメール
 * - FIRESTORE_KEY           : Firebase サービスアカウントの秘密鍵 (private_key)
 * - FIRESTORE_PROJECT_ID    : Firebase プロジェクトID
 * - LINE_GROUP_ACCESS_TOKEN : 全体通知用 LINE公式アカウントのチャネルアクセストークン
 * - LINE_GROUP_ID           : 全体通知の送信先 LINEグループID
 * - LINE_INDIV_ACCESS_TOKEN : 個別通知用 LINE公式アカウントのチャネルアクセストークン
 * ==============================================================================
 */

// ==========================================
// 共通定数・スクリプトプロパティの取得
// ==========================================
const props = PropertiesService.getScriptProperties();
const FIRESTORE_EMAIL = props.getProperty('FIRESTORE_EMAIL');
const FIRESTORE_KEY = (props.getProperty('FIRESTORE_KEY') || '').replace(/\\n/g, '\n');
const FIRESTORE_PROJECT_ID = props.getProperty('FIRESTORE_PROJECT_ID');

const LINE_GROUP_ACCESS_TOKEN = props.getProperty('LINE_GROUP_ACCESS_TOKEN');
const LINE_GROUP_ID = props.getProperty('LINE_GROUP_ID');
const LINE_INDIV_ACCESS_TOKEN = props.getProperty('LINE_INDIV_ACCESS_TOKEN');

const BASE_URL = "https://streak-navi.vercel.app";
const REMIND_INTERVAL_DAYS = 7;

// 旅費の各種ID定数
const TRAVEL_TYPE_ID = "fiUBTSW4SEGBfQlcisGh";       // 旅費の経費種別ID
const TRAVEL_CATEGORY_ID = "A9cSS41gjVwsGNWhwbGw"; // 旅費の経費区分ID
const TRAVEL_ITEM_ID = "bMLkvqIclyWwVJl0qydm";     // 旅費の経費項目ID

// スタジオ代の各種ID定数
const STUDIO_TYPE_ID = "fiUBTSW4SEGBfQlcisGh";       // スタジオ代の経費種別ID
const STUDIO_CATEGORY_ID = "YgrT3vCEkoYC88ZDFeWo"; // スタジオ代の経費区分ID
const STUDIO_ITEM_ID = "CvkhOp2UV0chRO4dlbL8";     // スタジオ代の経費項目ID

// ログ保存の上限件数設定
const MAX_LIMITS = {
  'accessLogs': 1000,        // アクセスログ
  'logs': 1000,              // 通常の動作ログ
  'errorLogs': 1000,         // エラーログ
  'connectLogs': 1000,       // 外部接続ログ
  'connectErrorLogs': 1000   // 外部接続エラーログ
};


// ==============================================================================
// トリガー関数 1: 朝 / 昼の各種通知実行 (runDailyNotifications)
// ==============================================================================
/**
 * 毎日朝・昼に実行するメイン関数
 * 推奨トリガー: 毎日 午前9:00〜10:00 または 12:00〜13:00
 */
function runDailyNotifications() {
  Logger.log('========== [昼/朝] 日次通知バッチ処理を開始します ==========');
  const firestore = getFirestore();
  if (!firestore) {
    Logger.log('Firestoreの接続初期化に失敗したため中断します。');
    return;
  }

  // 1. イベント・投票・曲募集の案内 (全体LINE)
  try {
    Logger.log('--- 1. イベント・投票・曲募集の案内処理開始 ---');
    execAutoNotification(firestore);
  } catch (e) {
    Logger.log('execAutoNotification Error: ' + e.toString());
  }

  // 2. 昨日行われたイベントの経費申請・旅費補助案内 (全体LINE)
  try {
    Logger.log('--- 2. 昨日イベントの経費・旅費補助案内処理開始 ---');
    remindYesterdayEventExpenses(firestore);
  } catch (e) {
    Logger.log('remindYesterdayEventExpenses Error: ' + e.toString());
  }

  // 3. TODO期限前・超過リマインド (個別LINE)
  try {
    Logger.log('--- 3. TODO期限リマインド処理開始 ---');
    execTodoDeadlineNotification(firestore);
  } catch (e) {
    Logger.log('execTodoDeadlineNotification Error: ' + e.toString());
  }

  // 4. イベント出席者の旅費補助申請未提出リマインド (個別LINE)
  try {
    Logger.log('--- 4. 旅費補助未提出リマインド処理開始 ---');
    remindPendingTravelExpenses(firestore);
  } catch (e) {
    Logger.log('remindPendingTravelExpenses Error: ' + e.toString());
  }

  // 5. 会計精算の未入金・受取証跡リマインド (個別LINE)
  try {
    Logger.log('--- 5. 会計精算リマインド処理開始 ---');
    execAccountingRemindNotification(firestore);
  } catch (e) {
    Logger.log('execAccountingRemindNotification Error: ' + e.toString());
  }

  Logger.log('========== [昼/朝] 日次通知バッチ処理が完了しました ==========');
}


// ==============================================================================
// トリガー関数 2: 夜 / 深夜のメンテナンス実行 (runNightlyMaintenance)
// ==============================================================================
/**
 * 毎日夜・深夜に実行するメンテナンス関数
 * 推奨トリガー: 毎日 深夜0:00〜1:00 または 23:00〜0:00
 */
function runNightlyMaintenance() {
  Logger.log('========== [夜/深夜] 定期メンテナンス処理を開始します ==========');
  const firestore = getFirestore();
  if (!firestore) {
    Logger.log('Firestoreの接続初期化に失敗したため中断します。');
    return;
  }

  // 1. 会計シーズンの自動作成 (四半期初日 1/1, 4/1, 7/1, 10/1 のみ実行)
  try {
    Logger.log('--- 1. 会計シーズン自動作成判定開始 ---');
    autoCreateAccountingSeason(firestore);
  } catch (e) {
    Logger.log('autoCreateAccountingSeason Error: ' + e.toString());
  }

  // 2. 古いログの定期クリーンアップ (上限1000件超過分の削除)
  try {
    Logger.log('--- 2. 古いログのクリーンアップ処理開始 ---');
    cleanAllOldLogs(firestore);
  } catch (e) {
    Logger.log('cleanAllOldLogs Error: ' + e.toString());
  }

  Logger.log('========== [夜/深夜] 定期メンテナンス処理が完了しました ==========');
}


// ==============================================================================
// 機能 1: イベント・投票・曲募集の案内 (旧 Navi_01)
// ==============================================================================
function execAutoNotification(firestore) {
  firestore = firestore || getFirestore();
  const JST = Session.getScriptTimeZone();
  const today = new Date();

  // 設定データ (noticeBase) の取得
  let config = null;
  try {
    const configDoc = firestore.getDocument('configs/noticeBase');
    if (!configDoc) {
      Logger.log('通知設定(noticeBase)が見つかりません。');
      return;
    }
    config = configDoc.obj || configDoc;
  } catch (err) {
    Logger.log('noticeBase 取得エラー: ' + err.toString());
    return;
  }

  // events コレクション
  const eventDocs = firestore.getDocuments('events');
  if (eventDocs && eventDocs.length > 0) {
    evaluateAndSendNotice('events', eventDocs, 'acceptStartDate', config.eventStartNotifications, today, JST, 'attendance', firestore);
    evaluateAndSendNotice('events', eventDocs, 'acceptEndDate', config.eventEndNotifications, today, JST, 'attendance', firestore);
    evaluateAndSendNotice('events', eventDocs, 'acceptStartDate', config.eventAdjStartNotifications, today, JST, 'schedule', firestore);
    evaluateAndSendNotice('events', eventDocs, 'acceptEndDate', config.eventAdjEndNotifications, today, JST, 'schedule', firestore);
  }

  // votes コレクション
  const voteDocs = firestore.getDocuments('votes');
  if (voteDocs && voteDocs.length > 0) {
    evaluateAndSendNotice('votes', voteDocs, 'acceptStartDate', config.voteStartNotifications, today, JST, null, firestore);
    evaluateAndSendNotice('votes', voteDocs, 'acceptEndDate', config.voteEndNotifications, today, JST, null, firestore);
  }

  // calls コレクション
  const callDocs = firestore.getDocuments('calls');
  if (callDocs && callDocs.length > 0) {
    evaluateAndSendNotice('calls', callDocs, 'acceptStartDate', config.callStartNotifications, today, JST, null, firestore);
    evaluateAndSendNotice('calls', callDocs, 'acceptEndDate', config.callEndNotifications, today, JST, null, firestore);
  }
}

function evaluateAndSendNotice(colName, docs, dateField, settings, today, JST, attendanceTypeFilter, firestore) {
  if (!docs || !settings || settings.length === 0) return;

  const targetDateMap = {};
  settings.forEach(s => {
    const targetDate = new Date(today.getTime());
    const offset = s.beforeAfter === 'before' ? s.days : -s.days;
    targetDate.setDate(targetDate.getDate() + offset);
    const dateStr = Utilities.formatDate(targetDate, JST, 'yyyy.MM.dd');
    if (!targetDateMap[dateStr]) targetDateMap[dateStr] = [];
    targetDateMap[dateStr].push(s.message);
  });

  docs.forEach(doc => {
    const data = doc.obj || doc;
    const docId = doc.name.split('/').pop();

    if (attendanceTypeFilter && data.attendanceType !== attendanceTypeFilter) return;
    if (data.isAcceptingResponses === false) return;

    const contentDate = data[dateField];
    if (contentDate && targetDateMap[contentDate]) {
      const displayDate = data.date || data.targetDate || '';
      const title = data.title || data.name || "名称未設定";
      const url = getTargetUrl(colName, docId);

      targetDateMap[contentDate].forEach(msg => {
        const fullMessage = `お疲れ様です！\n\n${msg}\n\n⭐${displayDate ? displayDate + '\n' : ''}${title}\n${url}`;
        const messageId = sendLinePush(LINE_GROUP_ID, fullMessage);

        if (messageId) {
          try {
            firestore.createDocument('notificationHistorys', {
              messageId: messageId,
              content: fullMessage,
              sentAt: new Date(),
              sourceCollection: colName,
              sourceDocId: docId,
              title: title
            });

            const notifType = colName === 'events' ? 'event' : colName === 'votes' ? 'vote' : colName === 'calls' ? 'call' : 'other';
            recordLineLog(firestore, {
              messageId: messageId,
              content: fullMessage,
              accountType: 'group',
              accountName: '全体グループ通知',
              notificationType: notifType,
              title: title,
              recipientType: 'group',
              recipientUid: 'group',
              recipientName: '全体グループ (バンドLINE)',
              recipientLineId: LINE_GROUP_ID,
              sourceCollection: colName,
              sourceDocId: docId
            });
            Logger.log(`[お知らせ通知] 履歴保存完了: ${messageId} (${title})`);
          } catch (err) {
            Logger.log(`[お知らせ通知] 履歴保存エラー: ${err.toString()}`);
          }
        }
      });
    }
  });
}

function getTargetUrl(type, id) {
  switch (type) {
    case 'events': return `${BASE_URL}/event/confirm?eventId=${id}`;
    case 'votes':  return `${BASE_URL}/vote/confirm?voteId=${id}`;
    case 'calls':  return `${BASE_URL}/call/confirm?callId=${id}`;
    default: return "";
  }
}


// ==============================================================================
// 機能 2: 昨日イベントの経費・旅費補助案内 (全体LINE)
// ==============================================================================
function remindYesterdayEventExpenses(firestore) {
  firestore = firestore || getFirestore();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formattedYesterday = Utilities.formatDate(yesterday, "JST", "yyyy.MM.dd");

  const events = firestore.getDocuments('events').filter(d => {
    const obj = d.obj || d;
    return obj.date === formattedYesterday;
  });

  if (events.length === 0) return;

  // configs/travel の arrivalPoints を取得
  let arrivalPoints = [];
  try {
    const travelConfigDoc = firestore.getDocument('configs/travel');
    const travelConfig = travelConfigDoc ? (travelConfigDoc.obj || travelConfigDoc) : null;
    if (travelConfig && Array.isArray(travelConfig.arrivalPoints)) {
      arrivalPoints = travelConfig.arrivalPoints;
    }
  } catch (cfgErr) {
    Logger.log('Travel Config Fetch Error: ' + cfgErr.toString());
  }

  events.forEach(d => {
    const e = d.obj || d;

    // イベント開催地が configs/travel の arrivalPoints に設定されている場合のみ通知対象とする
    if (!e.municipalityId) return;
    const isArrivalPoint = arrivalPoints.some(p =>
      p &&
      p.municipalityId === e.municipalityId &&
      (!p.prefectureId || !e.prefectureId || p.prefectureId === e.prefectureId)
    );
    if (!isArrivalPoint) return;

    const eventId = d.name.split('/').pop();
    const eventTitle = e.title || "イベント";

    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const dayOfWeek = weekdays[yesterday.getDay()];
    const month = yesterday.getMonth() + 1;
    const dateNum = yesterday.getDate();
    const dateStr = `${month}/${dateNum}(${dayOfWeek})`;

    let munLine = "";
    if (e.municipalityId) {
      try {
        let prefName = "";
        if (e.prefectureId) {
          const prefDoc = firestore.getDocument(`prefectures/${e.prefectureId}`);
          const prefObj = prefDoc ? (prefDoc.obj || prefDoc) : null;
          if (prefObj && prefObj.name) prefName = prefObj.name;
        }
        const munDoc = firestore.getDocument(`municipalities/${e.municipalityId}`);
        const munObj = munDoc ? (munDoc.obj || munDoc) : null;
        if (munObj && munObj.name) {
          munLine = `\n※今回は${prefName}${munObj.name}在住の方は対象外です`;
        }
      } catch (err) {
        Logger.log('Municipality Fetch Error: ' + err.toString());
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

    const messageId = sendLinePush(LINE_GROUP_ID, message);
    if (messageId) {
      try {
        firestore.createDocument('notificationHistorys', {
          messageId: messageId,
          content: message,
          sentAt: new Date(),
          sourceCollection: 'events',
          sourceDocId: eventId,
          title: eventTitle
        });
        recordLineLog(firestore, {
          messageId: messageId,
          content: message,
          accountType: 'group',
          accountName: '全体グループ通知',
          notificationType: 'event',
          title: `${eventTitle} 旅費補助案内`,
          recipientType: 'group',
          recipientUid: 'group',
          recipientName: '全体グループ (バンドLINE)',
          recipientLineId: LINE_GROUP_ID,
          sourceCollection: 'events',
          sourceDocId: eventId
        });
        Logger.log(`[昨日イベント案内] 履歴保存完了: ${messageId}`);
      } catch (err) {
        Logger.log(`[昨日イベント案内] 履歴保存エラー: ${err.toString()}`);
      }
    }
  });
}


// ==============================================================================
// 機能 3: TODO期限前・超過リマインド (個別LINE)
// ==============================================================================
function execTodoDeadlineNotification(firestore) {
  firestore = firestore || getFirestore();
  Logger.log(`[TODOリマインド] 処理開始。`);

  const issuesDoc = firestore.getDocuments('issues');
  const activeTodos = issuesDoc
    .map(doc => {
      const obj = doc.obj || doc;
      const id = doc.name ? doc.name.split('/').pop() : obj.id;
      return { ...obj, id };
    })
    .filter(todo => todo.status !== 'completed' && todo.date);

  Logger.log(`[TODOリマインド] 未完了の期限付きTODO件数: ${activeTodos.length}件`);
  let sentCount = 0;

  activeTodos.forEach(todo => {
    const elapsedDays = getElapsedDays(todo.date);
    if (elapsedDays === null) return;

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
    }

    if (!remindType) return;

    if (!todo.assigneeId) {
      Logger.log(`[TODOリマインド] TODO:「${todo.title}」担当者未設定のためスキップ`);
      return;
    }

    try {
      const lineMsgDoc = firestore.getDocument(`lineMessagingIds/${todo.assigneeId}`);
      const lineUid = (lineMsgDoc && lineMsgDoc.obj) ? lineMsgDoc.obj.lineUid : null;
      if (!lineUid) {
        Logger.log(`[TODOリマインド] 担当者 ID: ${todo.assigneeId} の lineUid が見つかりません`);
        return;
      }

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

      const messageId = sendLinePush(lineUid, message);
      if (messageId) {
        try {
          firestore.createDocument('notificationIndividualHistorys', {
            messageId: messageId,
            content: message,
            sentAt: new Date(),
            sourceCollection: 'issues',
            sourceDocId: todo.id,
            title: todo.title
          });
          recordLineLog(firestore, {
            messageId: messageId,
            content: message,
            accountType: 'individual',
            accountName: '個別通知BOT',
            notificationType: 'todo',
            title: `TODO: ${todo.title}`,
            recipientType: 'individual',
            recipientUid: todo.assigneeId,
            recipientName: todo.assigneeName || '担当メンバー',
            recipientLineId: lineUid,
            sourceCollection: 'issues',
            sourceDocId: todo.id
          });
          Logger.log(`[TODOリマインド] 送信完了:「${todo.title}」(担当者: ${todo.assigneeName || '不明'}, 種別: ${remindType})`);
          sentCount++;
        } catch (err) {
          Logger.log(`[TODOリマインド] 履歴保存エラー: ${err.toString()}`);
        }
      }
    } catch (userErr) {
      Logger.log(`[TODOリマインド] 送信エラー (TODO ID: ${todo.id}): ` + userErr.toString());
    }
  });

  Logger.log(`[TODOリマインド] 処理終了。通知送信件数: ${sentCount}件`);
}


// ==============================================================================
// 機能 4: 旅費補助未提出リマインド (個別LINE)
// ==============================================================================
function remindPendingTravelExpenses(firestore) {
  firestore = firestore || getFirestore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = firestore.getDocuments('events');
  const allAttendance = firestore.getDocuments('eventAttendanceAnswers');
  const allExpenses = firestore.getDocuments('expenseApplies');
  const users = firestore.getDocuments('users');

  const userMap = {};
  users.forEach(u => {
    const uid = u.name.split('/').pop();
    userMap[uid] = u.obj.displayName || "メンバー";
  });

  // configs/travel の arrivalPoints を取得
  let arrivalPoints = [];
  try {
    const travelConfigDoc = firestore.getDocument('configs/travel');
    const travelConfig = travelConfigDoc ? (travelConfigDoc.obj || travelConfigDoc) : null;
    if (travelConfig && Array.isArray(travelConfig.arrivalPoints)) {
      arrivalPoints = travelConfig.arrivalPoints;
    }
  } catch (cfgErr) {
    Logger.log('Travel Config Fetch Error: ' + cfgErr.toString());
  }

  events.forEach(docRef => {
    const e = docRef.obj || docRef;
    if (!e.date) return;

    // 2026年5月以降のイベントのみを対象にする (yyyy.MM.dd 形式)
    if (e.date < "2026.05.01") return;

    const dateParts = e.date.split('.');
    if (dateParts.length !== 3) return;
    const eventDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));

    const diffTime = today.getTime() - eventDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // イベント後7日おき（7日、14日、21日...）かつ過去90日以内のイベントを対象とする
    if (diffDays <= 0 || diffDays > 90 || diffDays % 7 !== 0) return;

    // イベント開催地が configs/travel の arrivalPoints に設定されている場合のみ通知対象とする
    if (!e.municipalityId) return;
    const isArrivalPoint = arrivalPoints.some(p =>
      p &&
      p.municipalityId === e.municipalityId &&
      (!p.prefectureId || !e.prefectureId || p.prefectureId === e.prefectureId)
    );
    if (!isArrivalPoint) return;

    const eventId = docRef.name.split('/').pop();
    const eventTitle = e.title || "イベント";

    // 出席と回答したユーザーを抽出
    const attendees = allAttendance.filter(attDoc => {
      const att = attDoc.obj || attDoc;
      return att.eventId === eventId && String(att.status) === "1";
    }).map(attDoc => {
      const att = attDoc.obj || attDoc;
      return att.uid;
    });

    if (attendees.length === 0) return;

    // すでにこのイベントの旅費申請を提出したユーザーを抽出
    const submittedUids = new Set();
    allExpenses.forEach(expDoc => {
      const exp = expDoc.obj || expDoc;
      if (exp.eventId === eventId &&
          (exp.expenseTypeId === TRAVEL_TYPE_ID || exp.typeId === TRAVEL_TYPE_ID) &&
          exp.categoryId === TRAVEL_CATEGORY_ID &&
          exp.itemId === TRAVEL_ITEM_ID) {
        submittedUids.add(exp.uid);
      }
    });

    const pendingUids = attendees.filter(uid => !submittedUids.has(uid));

    pendingUids.forEach(uid => {
      try {
        let userLoc = {};
        try {
          const locDoc = firestore.getDocument(`users/${uid}/private/location`);
          if (locDoc && locDoc.obj) userLoc = locDoc.obj;
        } catch (locErr) {
          Logger.log(`Failed to get location for user ${uid}: ` + locErr.toString());
        }

        const isLocationUnregistered = !userLoc.prefectureId || !userLoc.municipalityId;

        // イベント開催市区町村と同じ在住の場合は対象外
        if (!isLocationUnregistered) {
          if (e.municipalityId && userLoc.municipalityId === e.municipalityId) return;
        }

        const lineMsgDoc = firestore.getDocument(`lineMessagingIds/${uid}`);
        const lineUid = (lineMsgDoc && lineMsgDoc.obj) ? lineMsgDoc.obj.lineUid : null;
        if (!lineUid) return;

        const dateStr = `${Number(dateParts[1])}/${Number(dateParts[2])}`;
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

        const messageId = sendLinePush(lineUid, message);
        if (messageId) {
          try {
            firestore.createDocument('notificationIndividualHistorys', {
              messageId: messageId,
              content: message,
              sentAt: new Date(),
              sourceCollection: 'events',
              sourceDocId: eventId,
              title: eventTitle
            });
            recordLineLog(firestore, {
              messageId: messageId,
              content: message,
              accountType: 'individual',
              accountName: '個別通知BOT',
              notificationType: 'accounting',
              title: `${eventTitle} 旅費補助申請催促`,
              recipientType: 'individual',
              recipientUid: uid,
              recipientName: userMap[uid] || 'メンバー',
              recipientLineId: lineUid,
              sourceCollection: 'events',
              sourceDocId: eventId
            });
            Logger.log(`[旅費未提出催促] 履歴保存完了: ${messageId} (User: ${uid})`);
          } catch (err) {
            Logger.log(`[旅費未提出催促] 履歴保存エラー: ${err.toString()}`);
          }
        }
      } catch (uidErr) {
        Logger.log(`Error processing user ${uid} for event ${eventId}: ` + uidErr.toString());
      }
    });
  });
}


// ==============================================================================
// 機能 5: 会計精算の未入金・受取証跡リマインド (個別LINE)
// ==============================================================================
function execAccountingRemindNotification(firestore) {
  firestore = firestore || getFirestore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const seasonDocs = firestore.getDocuments('accountingSeasons');
  if (seasonDocs.length === 0) return;

  const expenseTypes = firestore.getDocuments('expenseTypes');
  const incomeTypeMap = {};
  expenseTypes.forEach(t => {
    const data = t.obj || t;
    incomeTypeMap[t.name.split('/').pop()] = data.isIncome === true;
  });

  const allExpenses = firestore.getDocuments('expenseApplies');
  const allIncomes = firestore.getDocuments('incomes');
  const users = firestore.getDocuments('users');
  const userMap = {};
  users.forEach(u => {
    const uid = u.name.split('/').pop();
    userMap[uid] = u.obj.displayName;
  });

  seasonDocs.forEach(doc => {
    const s = doc.obj || doc;
    if (!s.endDate) return;
    const endDate = new Date(s.endDate.replace(/\./g, '/'));
    const diffDays = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0 || diffDays % REMIND_INTERVAL_DAYS !== 0) return;

    const seasonId = s.id;
    const year = s.year;
    const seasonKey = s.seasonKey;
    const memberIds = s.memberIds || [];
    const managerId = s.managerId;
    if (memberIds.length === 0) return;

    const ranges = {
      winter: { s: `${year}.01.01`, e: `${year}.03.31` },
      spring: { s: `${year}.04.01`, e: `${year}.06.30` },
      summer: { s: `${year}.07.01`, e: `${year}.09.30` },
      autumn: { s: `${year}.10.01`, e: `${year}.12.31` }
    };
    const range = ranges[seasonKey];
    if (!range) return;

    const expenses = allExpenses.filter(d => {
      const obj = d.obj || d;
      return obj.status === 'approved' && obj.date >= range.s && obj.date <= range.e;
    });
    const incomes = allIncomes.filter(d => {
      const obj = d.obj || d;
      return obj.date >= range.s && obj.date <= range.e;
    });

    let totalExp = 0;
    let totalInc = 0;
    const userContrib = {};

    expenses.forEach(d => {
      const e = d.obj;
      if (memberIds.includes(e.uid)) {
        const isIncome = e.isIncome || incomeTypeMap[e.expenseTypeId || e.typeId];
        const amount = Number(e.amount);
        if (isIncome) { totalInc += amount; userContrib[e.uid] = (userContrib[e.uid] || 0) - amount; }
        else { totalExp += amount; userContrib[e.uid] = (userContrib[e.uid] || 0) + amount; }
      }
    });

    incomes.forEach(d => {
      const i = d.obj;
      if (memberIds.includes(i.uid)) {
        const amount = Number(i.amount);
        totalInc += amount;
        userContrib[i.uid] = (userContrib[i.uid] || 0) - amount;
      }
    });

    const netTotal = totalExp - totalInc;
    const avg = Math.floor(netTotal / memberIds.length);

    const notifications = [];
    const pendingReceivers = [];

    memberIds.forEach(uid => {
      const hasEvidence = s.evidenceUrls && s.evidenceUrls[uid] && s.evidenceUrls[uid].trim() !== "";
      if (hasEvidence) return;

      const contrib = userContrib[uid] || 0;
      const settlement = avg - contrib;

      if (settlement > 0) {
        if (uid === managerId) return;
        const msg = `お疲れ様です！Streak Navi コンシェルジュです🍀\n\n` +
                    `【バランス会計・お支払いのお願い】\n` +
                    `「${s.name}」の支払が確認できていません。リンクよりお支払いをお願いします。🙇‍♂️\n` +
                    `${BASE_URL}/accounting/confirm?seasonId=${s.id}`;
        notifications.push({ toUid: uid, msg: msg });
      } else if (settlement < 0) {
        if (uid === managerId) return;
        const receiverName = userMap[uid] || "メンバー";
        pendingReceivers.push({
          name: receiverName,
          amount: Math.abs(settlement)
        });
      }
    });

    if (managerId && pendingReceivers.length > 0) {
      const receiverListStr = pendingReceivers
        .map(r => `・${r.name}さん (¥${r.amount.toLocaleString()})`)
        .join('\n');
      const msg = `お疲れ様です！Streak Navi コンシェルジュです🍀\n\n` +
                  `【バランス会計・受取証跡アップロードのお願い】\n` +
                  `「${s.name}」の以下のメンバーへの受取証明（スクショ）が未提出です。送金後スクショアップロードをお願いします。🙇‍♂️\n\n` +
                  `${receiverListStr}\n\n` +
                  `${BASE_URL}/accounting/confirm?seasonId=${s.id}`;
      notifications.push({ toUid: managerId, msg: msg });
    }

    notifications.forEach(n => {
      const lineMsgDoc = firestore.getDocument(`lineMessagingIds/${n.toUid}`);
      const lineUid = (lineMsgDoc && lineMsgDoc.obj) ? lineMsgDoc.obj.lineUid : null;
      if (!lineUid) return;
      const messageId = sendLinePush(lineUid, n.msg);
      if (messageId) {
        try {
          firestore.createDocument('notificationIndividualHistorys', {
            messageId: messageId,
            content: n.msg,
            sentAt: new Date(),
            sourceCollection: 'accountingSeasons',
            sourceDocId: seasonId,
            title: s.name
          });
          recordLineLog(firestore, {
            messageId: messageId,
            content: n.msg,
            accountType: 'individual',
            accountName: '個別通知BOT',
            notificationType: 'accounting',
            title: `${s.name} 精算リマインド`,
            recipientType: 'individual',
            recipientUid: n.toUid,
            recipientName: userMap[n.toUid] || 'メンバー',
            recipientLineId: lineUid,
            sourceCollection: 'accountingSeasons',
            sourceDocId: seasonId
          });
          Logger.log(`[会計精算リマインド] 履歴保存完了: ${messageId}`);
        } catch (err) {
          Logger.log(`[会計精算リマインド] 履歴保存エラー: ${err.toString()}`);
        }
      }
    });
  });
}


// ==============================================================================
// 機能 6: 会計シーズンの自動作成 (四半期初日 1/1, 4/1, 7/1, 10/1)
// ==============================================================================
function autoCreateAccountingSeason(firestore) {
  firestore = firestore || getFirestore();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();

  // 四半期初日（1/1, 4/1, 7/1, 10/1）のみ実行
  if (date !== 1) {
    Logger.log(`[会計シーズン作成] 本日は ${month}/${date} のため、四半期初日ではありません。スキップします。`);
    return;
  }

  let seasonKey = "";
  let endDateStr = "";
  let seasonName = "";

  if (month === 1) {
    seasonKey = "winter"; endDateStr = `${year}.03.31`; seasonName = `${year}年 冬`;
  } else if (month === 4) {
    seasonKey = "spring"; endDateStr = `${year}.06.30`; seasonName = `${year}年 春`;
  } else if (month === 7) {
    seasonKey = "summer"; endDateStr = `${year}.09.30`; seasonName = `${year}年 夏`;
  } else if (month === 10) {
    seasonKey = "autumn"; endDateStr = `${year}.12.31`; seasonName = `${year}年 秋`;
  }

  if (!seasonKey) return;

  const seasonId = `${year}-${seasonKey}`;
  try {
    firestore.getDocument(`accountingSeasons/${seasonId}`);
    Logger.log(`[会計シーズン作成] シーズン ${seasonId} はすでに存在します。`);
  } catch (e) {
    // 存在しない場合は新規作成
    const users = firestore.getDocuments('users');
    const memberIds = users.map(doc => doc.name.split('/').pop());
    firestore.createDocument(`accountingSeasons/${seasonId}`, {
      id: seasonId,
      year: year,
      seasonKey: seasonKey,
      name: seasonName + "シーズン",
      memberIds: memberIds,
      endDate: endDateStr,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    Logger.log(`[会計シーズン作成] 新シーズン ${seasonId} を作成しました。`);
  }
}


// ==============================================================================
// 機能 7: 古いログの定期クリーンアップ (旧 Navi_99)
// ==============================================================================
function cleanAllOldLogs(firestore) {
  firestore = firestore || getFirestore();
  Logger.log('--- ログクリーンアップ処理を開始します ---');

  for (const [collectionName, maxLimit] of Object.entries(MAX_LIMITS)) {
    Logger.log(`[${collectionName}] 処理開始 (上限件数: ${maxLimit}件)`);
    let docs = [];
    try {
      docs = firestore.getDocuments(collectionName);
    } catch (docErr) {
      Logger.log(`[${collectionName}] 取得エラー: ` + docErr.toString());
      continue;
    }

    if (!docs || docs.length === 0) {
      Logger.log(`[${collectionName}] ドキュメントが存在しないためスキップします。`);
      continue;
    }

    Logger.log(`[${collectionName}] 現在の総件数: ${docs.length}件`);
    if (docs.length <= maxLimit) {
      Logger.log(`[${collectionName}] 上限以下のため、削除の必要はありません。`);
      continue;
    }

    const formattedDocs = docs.map(doc => {
      const data = doc.obj || doc;
      const docId = doc.name.split('/').pop();
      const timestamp = data.createdAt ? new Date(data.createdAt).getTime() : 0;
      return {
        id: docId,
        path: `${collectionName}/${docId}`,
        timestamp: timestamp
      };
    });

    formattedDocs.sort((a, b) => b.timestamp - a.timestamp);
    const docsToDelete = formattedDocs.slice(maxLimit);
    Logger.log(`[${collectionName}] 上限を超過した ${docsToDelete.length} 件の古いログを削除します。`);

    let deleteCount = 0;
    docsToDelete.forEach(target => {
      try {
        firestore.deleteDocument(target.path);
        deleteCount++;
      } catch (err) {
        Logger.log(`[${collectionName}] 削除失敗: ${target.path} - ${err.toString()}`);
      }
    });

    Logger.log(`[${collectionName}] 削除処理完了 (成功: ${deleteCount} / 対象: ${docsToDelete.length})`);
  }

  Logger.log('--- すべてのログクリーンアップ処理が完了しました ---');
}


// ==============================================================================
// 共通ユーティリティ関数
// ==============================================================================

/**
 * Firestore インスタンスの取得
 */
function getFirestore() {
  try {
    return FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);
  } catch (e) {
    Logger.log('FirestoreApp 初期化エラー: ' + e.toString());
    return null;
  }
}

/**
 * LINE Push メッセージ送信関数
 * @param {string} to - 送信先 (グループID または 個人の lineUid)
 * @param {string} messageText - 送信メッセージ本文
 * @returns {string|null} - 成功時はメッセージID
 */
function sendLinePush(to, messageText) {
  if (!to || !messageText) return null;
  const isGroup = to.startsWith('C') || to === LINE_GROUP_ID;
  const token = isGroup ? LINE_GROUP_ACCESS_TOKEN : LINE_INDIV_ACCESS_TOKEN;
  if (!token) {
    Logger.log(`LINEトークンが設定されていません (宛先種別: ${isGroup ? 'グループ' : '個別'})`);
    return null;
  }

  const payload = { to: to, messages: [{ type: 'text', text: messageText }] };
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
    const resCode = response.getResponseCode();
    const resJson = JSON.parse(response.getContentText());

    if (resCode === 200 && resJson.sentMessages && resJson.sentMessages.length > 0) {
      return resJson.sentMessages[0].id;
    } else {
      Logger.log('LINE Push 送信失敗 (' + resCode + '): ' + response.getContentText());
      return null;
    }
  } catch (e) {
    Logger.log('LINE Push 例外エラー: ' + e.toString());
    return null;
  }
}

/**
 * LINE送信履歴を共通ログコレクション (lineNotificationLogs) に保存
 */
function recordLineLog(firestore, options) {
  if (!firestore) return;
  try {
    const now = new Date();
    const JST = "Asia/Tokyo";
    const sentAtFormatted = Utilities.formatDate(now, JST, 'yyyy/MM/dd HH:mm:ss');
    const yearMonth = Utilities.formatDate(now, JST, 'yyyy-MM');
    const dateStr = Utilities.formatDate(now, JST, 'yyyy-MM-dd');

    const lines = (options.content || '').split('\n').filter(function(l) { return l.trim().length > 0; });
    const summary = lines.slice(0, 2).join(' / ');

    const logDoc = {
      accountType: options.accountType || 'individual',
      accountName: options.accountName || (options.accountType === 'group' ? '全体グループ通知' : '個別通知BOT'),
      notificationType: options.notificationType || 'other',
      notificationTitle: options.title || 'LINE通知',
      recipientType: options.recipientType || options.accountType || 'individual',
      recipientUid: options.recipientUid || '',
      recipientName: options.recipientName || (options.accountType === 'group' ? '全体グループ (バンドLINE)' : 'メンバー'),
      recipientLineId: options.recipientLineId || '',
      messages: [{ type: 'text', text: options.content }],
      messageCount: 1,
      summary: summary.length > 80 ? summary.substring(0, 80) + '...' : summary,
      details: {
        messageId: options.messageId,
        sourceCollection: options.sourceCollection,
        sourceDocId: options.sourceDocId
      },
      status: 'success',
      statusCode: 200,
      sentAt: now.getTime(),
      sentAtFormatted: sentAtFormatted,
      yearMonth: yearMonth,
      date: dateStr,
      sourceCollection: options.sourceCollection,
      sourceDocId: options.sourceDocId
    };

    firestore.createDocument('lineNotificationLogs', logDoc);
  } catch (err) {
    Logger.log('recordLineLog error: ' + err.toString());
  }
}

/**
 * 日本時間(JST)基準で yyyy.MM.dd 文字列を Date にパース
 */
function parseJstDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('.');
  if (parts.length !== 3) return null;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/**
 * 期限日までの経過日数を取得 (本日 - 期限日)
 */
function getElapsedDays(dateStr) {
  const targetDate = parseJstDate(dateStr);
  if (!targetDate) return null;
  const now = new Date();
  const jstNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = jstNow.getTime() - targetDate.getTime();
  return Math.round(diffTime / (24 * 60 * 60 * 1000));
}

/**
 * TODOステータスの表示名
 */
function getStatusName(status) {
  switch (status) {
    case "not_started": return "未実施";
    case "in_progress": return "実施中";
    case "completed":   return "実施済";
    default: return status || "未実施";
  }
}
