// スクリプトプロパティからキーを取得
const LINE_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
const LINE_GROUP_ID = PropertiesService.getScriptProperties().getProperty('LINE_GROUP_ID');
const FIRESTORE_EMAIL = PropertiesService.getScriptProperties().getProperty('FIRESTORE_EMAIL');
const FIRESTORE_KEY = PropertiesService.getScriptProperties().getProperty('FIRESTORE_KEY').replace(/\\n/g, '\n');
const FIRESTORE_PROJECT_ID = PropertiesService.getScriptProperties().getProperty('FIRESTORE_PROJECT_ID');

/**
 * 毎日9時に実行される自動通知メイン関数
 */
function execAutoNotification() {
  try {
    const firestore = FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);
    const JST = Session.getScriptTimeZone();
    const today = new Date();
    
    // 1. 設定データ (noticeBase) の取得
    const configDoc = firestore.getDocument('configs/noticeBase');
    if (!configDoc) {
      Logger.log('通知設定(noticeBase)が見つかりません。');
      return;
    }
    const config = configDoc.obj;

    // --- 各コレクションの処理 ---

    // 2. events コレクション (出欠 / 日程調整)
    const eventDocs = firestore.getDocuments('events');
    if (eventDocs && eventDocs.length > 0) {
      evaluateAndSend('events', eventDocs, 'acceptStartDate', config.eventStartNotifications, today, JST, 'attendance', firestore);
      evaluateAndSend('events', eventDocs, 'acceptEndDate', config.eventEndNotifications, today, JST, 'attendance', firestore);
      
      evaluateAndSend('events', eventDocs, 'acceptStartDate', config.eventAdjStartNotifications, today, JST, 'schedule', firestore);
      evaluateAndSend('events', eventDocs, 'acceptEndDate', config.eventAdjEndNotifications, today, JST, 'schedule', firestore);
    }

    // 4. votes コレクション (投票)
    const voteDocs = firestore.getDocuments('votes');
    if (voteDocs && voteDocs.length > 0) {
      evaluateAndSend('votes', voteDocs, 'acceptStartDate', config.voteStartNotifications, today, JST, null, firestore);
      evaluateAndSend('votes', voteDocs, 'acceptEndDate', config.voteEndNotifications, today, JST, null, firestore);
    }

    // 5. calls コレクション (曲募集)
    const callDocs = firestore.getDocuments('calls');
    if (callDocs && callDocs.length > 0) {
      evaluateAndSend('calls', callDocs, 'acceptStartDate', config.callStartNotifications, today, JST, null, firestore);
      evaluateAndSend('calls', callDocs, 'acceptEndDate', config.callEndNotifications, today, JST, null, firestore);
    }

  } catch (e) {
    Logger.log('Error in execAutoNotification: ' + e.toString());
  }
}

/**
 * 条件判定と送信を行う
 */
function evaluateAndSend(colName, docs, dateField, settings, today, JST, attendanceTypeFilter, firestore) {
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
        
        const messageId = sendLinePush(fullMessage);
        
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
            Logger.log(`履歴保存完了: ${messageId}`);
          } catch (err) {
            Logger.log(`履歴保存エラー: ${err.toString()}`);
          }
        }
      });
    }
  });
}

function getTargetUrl(type, id) {
  const baseUrl = "https://streak-navi.vercel.app/";
  switch (type) {
    case 'events':   return `${baseUrl}/event/confirm?eventId=${id}`;
    case 'votes':    return `${baseUrl}/vote/confirm?voteId=${id}`;
    case 'calls':    return `${baseUrl}/call/confirm?callId=${id}`;
    default: return "";
  }
}

/**
 * LINEにメッセージを送信
 */
function sendLinePush(messageText) {
  if (!LINE_GROUP_ID || !LINE_ACCESS_TOKEN) return null;
  const payload = { to: LINE_GROUP_ID, messages: [{ type: 'text', text: messageText }] };
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': { 'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN },
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
