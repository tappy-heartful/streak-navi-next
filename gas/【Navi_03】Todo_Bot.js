/**
 * TODO 期限通知自動化スクリプト (GAS用)
 *
 * 【このスクリプトがやること】
 * 1. execTodoDeadlineNotification:
 *    - 毎日朝実行されるトリガーを想定。
 *    - 未完了のTODO（statusが 'completed' 以外）を取得。
 *    - 期限日（date: yyyy.MM.dd）を判定し、期限日までの経過日数に応じて以下のタイミングで担当者へ個別にLINE通知を送信する。
 *      - 期限前: 7日前、3日前、当日
 *      - 期限超過後: 翌日（1日後）、および以降7日ごと（8日後、15日後、22日後...）の周期的通知
 */

const props = PropertiesService.getScriptProperties();
const LINE_INDIV_ACCESS_TOKEN = props.getProperty('LINE_INDIV_ACCESS_TOKEN');
const FIRESTORE_EMAIL = props.getProperty('FIRESTORE_EMAIL');
const FIRESTORE_KEY = props.getProperty('FIRESTORE_KEY').replace(/\\n/g, '\n');
const FIRESTORE_PROJECT_ID = props.getProperty('FIRESTORE_PROJECT_ID');

const BASE_URL = "https://streak-navi.vercel.app";

/**
 * トリガーによって毎日朝実行するメイン関数
 */
function execTodoDeadlineNotification() {
  try {
    const firestore = FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);

    Logger.log(`[TODOリマインド] 処理開始。`);

    // 1. 全てのTODOを取得し、未完了のものを抽出
    const issuesDoc = firestore.getDocuments('issues');
    const activeTodos = issuesDoc
      .map(doc => {
        const obj = doc.obj || doc;
        // ドキュメントIDを抽出
        const id = doc.name ? doc.name.split('/').pop() : obj.id;
        return { ...obj, id };
      })
      .filter(todo => todo.status !== 'completed' && todo.date); // 完了済は除外、期限日未設定も除外

    Logger.log(`[TODOリマインド] 未完了の期限付きTODO件数: ${activeTodos.length}件`);

    let sentCount = 0;

    // 2. 各TODOの期限日を判定してリマインド送信
    activeTodos.forEach(todo => {
      const elapsedDays = getElapsedDays(todo.date);
      if (elapsedDays === null) return;

      let remindType = ""; // "7日前", "当日", "期限切れ翌日", "期限切れ超過"
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

      if (!remindType) {
        return; // 対象外の日数
      }

      // 担当者のLINE宛先を取得
      if (!todo.assigneeId) {
        Logger.log(`[TODOリマインド] TODO:「${todo.title}」には担当者が割り当てられていません。送信をスキップします。`);
        return;
      }

      try {
        const lineMsgDoc = firestore.getDocument(`lineMessagingIds/${todo.assigneeId}`);
        const lineUid = (lineMsgDoc && lineMsgDoc.obj) ? lineMsgDoc.obj.lineUid : null;

        if (!lineUid) {
          Logger.log(`[TODOリマインド] 担当者 ID: ${todo.assigneeId} (${todo.assigneeName || '名前不明'}) の LINE 連携ID (lineUid) が見つかりません。`);
          return;
        }

        // 送信メッセージ作成
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
            Logger.log(`[TODOリマインド] 履歴保存完了 (個別): ${messageId}`);
          } catch (err) {
            Logger.log(`[TODOリマインド] 履歴保存エラー (個別): ${err.toString()}`);
          }
        }
        Logger.log(`[TODOリマインド] 送信完了:「${todo.title}」(担当者: ${todo.assigneeName || '不明'}, 種別: ${remindType}, 経過日数: ${elapsedDays}日)`);
        sentCount++;
      } catch (userErr) {
        Logger.log(`[TODOリマインド] 担当者への通知処理エラー (TODO ID: ${todo.id}): ` + userErr.toString());
      }
    });

    Logger.log(`[TODOリマインド] 処理終了。通知送信件数: ${sentCount}件`);
  } catch (e) {
    Logger.log('[TODOリマインド] 致命的なエラー: ' + e.toString());
  }
}

/**
 * 日本時間(JST)のタイムゾーンを考慮して、日付文字列 "yyyy.MM.dd" から Date オブジェクトを作成する
 */
function parseJstDate(dateStr) {
  const parts = dateStr.split('.');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  // GASの実行環境（通常はAsia/Tokyo）のタイムゾーン午前0時でオブジェクトを作成
  return new Date(y, m, d);
}

/**
 * 期限日までの経過日数を取得する (本日 - 期限日)
 * @return 期限当日なら 0, 期限の1日前（明日期限）なら -1, 期限の1日後（昨日期限）なら 1, 判定エラー時は null
 */
function getElapsedDays(dateStr) {
  const targetDate = parseJstDate(dateStr);
  if (!targetDate) return null;

  // 今日の午前0時 (日本時間) のDateオブジェクトを作成
  const now = new Date();
  const jstNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = jstNow.getTime() - targetDate.getTime();
  return Math.round(diffTime / (24 * 60 * 60 * 1000));
}

/**
 * TODOステータスの表示名を取得
 */
function getStatusName(status) {
  switch (status) {
    case "not_started": return "未実施";
    case "in_progress": return "実施中";
    default: return status || "未実施";
  }
}

/**
 * LINEメッセージ送信関数 (メッセージIDを返す)
 */
function sendLinePush(to, messageText) {
  if (!to || !LINE_INDIV_ACCESS_TOKEN) return null;
  const payload = { to: to, messages: [{ type: 'text', text: messageText }] };
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': { 'Authorization': 'Bearer ' + LINE_INDIV_ACCESS_TOKEN },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  try {
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
    const resCode = response.getResponseCode();
    const resJson = JSON.parse(response.getContentText());

    if (resCode === 200 && resJson.sentMessages && resJson.sentMessages.length > 0) {
      return resJson.sentMessages[0].id;
    } else {
      Logger.log('LINE Push Failed: ' + response.getContentText());
      return null;
    }
  } catch (e) {
    Logger.log('LINE Push Error: ' + e.toString());
    return null;
  }
}
