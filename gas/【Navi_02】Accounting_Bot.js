/**
  * バランス会計 自動運用スクリプト (Ver 2.5 - 経費申請リマインド機能追加版)
  *
  * 【このスクリプトがやること】
  * 1. autoCreateAccountingSeason:
  *    - 3ヶ月に一度（1/1, 4/1, 7/1, 10/1）に新シーズンのドキュメントを自動作成。
  *    - 前シーズンの会計結果（平均額や各メンバーの精算額リスト）を LINE グループへ送信。
  *    - 支払い対象者へ、具体的なPayPay送金手順を案内。
  *    - 新シーズンの開始メッセージを LINE グループへ送信。
  * 2. execAccountingRemindNotification:
  *    - 毎日9時に実行。精算期間が終了したシーズンの未入金者に個別に LINE 催促。
  *      （支払者には本人へ催促、受取者については証跡アップロード担当であるシーズン担当者へ催促）
  * 3. remindYesterdayEventExpenses:
  *    - 毎日実行（イベントの翌日想定）。昨日行われたイベントの経費申請（旅費・スタジオ代）を促すリマインドを LINE グループへ送信。
  */

 const props = PropertiesService.getScriptProperties();
 const LINE_INDIV_ACCESS_TOKEN = props.getProperty('LINE_INDIV_ACCESS_TOKEN');
 const LINE_GROUP_ACCESS_TOKEN = props.getProperty('LINE_GROUP_ACCESS_TOKEN');
 const LINE_GROUP_ID = props.getProperty('LINE_GROUP_ID');
 const FIRESTORE_EMAIL = props.getProperty('FIRESTORE_EMAIL');
 const FIRESTORE_KEY = props.getProperty('FIRESTORE_KEY').replace(/\\n/g, '\n');
 const FIRESTORE_PROJECT_ID = props.getProperty('FIRESTORE_PROJECT_ID');

 const REMIND_INTERVAL_DAYS = 7;
 const BASE_URL = "https://streak-navi.vercel.app";

 // ==========================================
 // 経費申請用 GETパラメータ定数
 // ==========================================
 // 旅費の各種ID定数（実際のデータベースのIDに合わせて適宜修正してください）
 const TRAVEL_TYPE_ID = "fiUBTSW4SEGBfQlcisGh";         // 旅費の経費種別ID
 const TRAVEL_CATEGORY_ID = "A9cSS41gjVwsGNWhwbGw";   // 旅費の経費区分ID
 const TRAVEL_ITEM_ID = "bMLkvqIclyWwVJl0qydm";   // 旅費の経費項目ID

 // スタジオ代の各種ID定数（実際のデータベースのIDに合わせて適宜修正してください）
 const STUDIO_TYPE_ID = "fiUBTSW4SEGBfQlcisGh";         // スタジオ代の経費種別ID
 const STUDIO_CATEGORY_ID = "YgrT3vCEkoYC88ZDFeWo";   // スタジオ代の経費区分ID
 const STUDIO_ITEM_ID = "CvkhOp2UV0chRO4dlbL8";   // スタジオ代の経費項目ID

 function autoCreateAccountingSeason() {
   try {
     const firestore = FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);
     const now = new Date();
     const year = now.getFullYear();
     const month = now.getMonth() + 1;
     if (now.getDate() !== 1) return;

     let seasonKey = "";
     let prevSeasonKey = "";
     let prevYear = year;
     let endDateStr = "";
     let seasonName = "";

     if (month === 1) {
       seasonKey = "winter"; endDateStr = `${year}.03.31`; seasonName = `${year}年 冬`;
       prevSeasonKey = "autumn"; prevYear = year - 1;
     } else if (month === 4) {
       seasonKey = "spring"; endDateStr = `${year}.06.30`; seasonName = `${year}年 春`;
       prevSeasonKey = "winter";
     } else if (month === 7) {
       seasonKey = "summer"; endDateStr = `${year}.09.30`; seasonName = `${year}年 夏`;
       prevSeasonKey = "spring";
     } else if (month === 10) {
       seasonKey = "autumn"; endDateStr = `${year}.12.31`; seasonName = `${year}年 秋`;
       prevSeasonKey = "summer";
     }

     if (!seasonKey) return;

     sendPrevSeasonSummary(firestore, prevYear, prevSeasonKey);

     const seasonId = `${year}-${seasonKey}`;
     try {
       firestore.getDocument(`accountingSeasons/${seasonId}`);
     } catch (e) {
       const users = firestore.getDocuments('users');
       const memberIds = users.map(doc => doc.name.split('/').pop());
       firestore.createDocument(`accountingSeasons/${seasonId}`, {
         id: seasonId, year, seasonKey, name: seasonName + "シーズン",
         memberIds, endDate: endDateStr, createdAt: Date.now(), updatedAt: Date.now()
       });

       const messageText = `【バランス会計】\n今日から「${seasonName}シーズン」の会計が開始されます。これ以降の収支は新しいシーズンに計上されます。よろしくお願いします！\n${BASE_URL}/accounting`;
       const messageId = sendLinePush(LINE_GROUP_ID, messageText);
       if (messageId) {
         try {
           firestore.createDocument('notificationHistorys', {
             messageId: messageId,
             content: messageText,
             sentAt: new Date(),
             sourceCollection: 'accountingSeasons',
             sourceDocId: seasonId,
             title: seasonName + "シーズン"
           });
           Logger.log(`履歴保存完了: ${messageId}`);
         } catch (err) {
           Logger.log(`履歴保存エラー: ${err.toString()}`);
         }
       }
     }
   } catch (e) { Logger.log('Error: ' + e.toString()); }
 }

 function sendPrevSeasonSummary(firestore, year, seasonKey) {
   try {
     const seasonId = `${year}-${seasonKey}`;
     const season = firestore.getDocument(`accountingSeasons/${seasonId}`).obj;
     const ranges = {
       winter: { s: `${year}.01.01`, e: `${year}.03.31` },
       spring: { s: `${year}.04.01`, e: `${year}.06.30` },
       summer: { s: `${year}.07.01`, e: `${year}.09.30` },
       autumn: { s: `${year}.10.01`, e: `${year}.12.31` }
     };
     const range = ranges[seasonKey];

     const expenseTypes = firestore.getDocuments('expenseTypes');
     const incomeTypeMap = {};
     expenseTypes.forEach(t => {
       const data = t.obj || t;
       incomeTypeMap[t.name.split('/').pop()] = data.isIncome === true;
     });

     const expenses = firestore.getDocuments('expenseApplies').filter(d => {
       const obj = d.obj || d;
       return obj.status === 'approved' && obj.date >= range.s && obj.date <= range.e;
     });
     const incomes = firestore.getDocuments('incomes').filter(d => {
       const obj = d.obj || d;
       return obj.date >= range.s && obj.date <= range.e;
     });
     const users = firestore.getDocuments('users');
     const userMap = {};
     const paypayMap = {};
     users.forEach(u => {
       const uid = u.name.split('/').pop();
       userMap[uid] = u.obj.displayName;
       paypayMap[uid] = u.obj.paypayId;
     });

     const memberIds = season.memberIds || [];
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
     const avg = memberIds.length > 0 ? Math.floor(netTotal / memberIds.length) : 0;

     let listStr = "";
     memberIds.forEach(uid => {
       const contrib = userContrib[uid] || 0;
       const settlement = avg - contrib;
       const type = settlement > 0 ? "支払" : "受取";
       listStr += `・${userMap[uid] || "不明"}: ${type} ¥${Math.abs(settlement).toLocaleString()}\n`;
     });

     let managerName = "未設定";
     let managerPaypayId = "";
     if (season.managerId) {
       managerName = userMap[season.managerId] || "未設定";
       managerPaypayId = paypayMap[season.managerId] || "";
     }

     // 送金手順ガイドの構築
     const managerSearchText = managerPaypayId ? `「${managerPaypayId}」を検索` : `「${managerName}」を検索`;
     const payInstruction = `\n\n【送金手順】\n「支払」が発生する方は、以下の手順で担当（${managerName}）へ送金をお願いします。\n1. PayPayアプリを開く\n2. 「送る」タブを選択\n3. ${managerSearchText}\n4. 自身の精算額を送金`;

     const message = `【バランス会計・前シーズン精算結果】\n「${season.name}」の集計が完了しました。\n\n総支出: ¥${totalExp.toLocaleString()}\n総収入: ¥${totalInc.toLocaleString()}\n平均負担額: ¥${avg.toLocaleString()}\n\n■ 各メンバー精算額\n${listStr}\n詳細はこちら:\n${BASE_URL}/accounting/confirm?seasonId=${seasonId}${payInstruction}`;

     const messageId = sendLinePush(LINE_GROUP_ID, message);
     if (messageId) {
       try {
         firestore.createDocument('notificationHistorys', {
           messageId: messageId,
           content: message,
           sentAt: new Date(),
           sourceCollection: 'accountingSeasons',
           sourceDocId: seasonId,
           title: season.name
         });
         Logger.log(`履歴保存完了: ${messageId}`);
       } catch (err) {
         Logger.log(`履歴保存エラー: ${err.toString()}`);
       }
     }
   } catch (e) { Logger.log('Summary Error: ' + e.toString()); }
 }

 function execAccountingRemindNotification() {
   try {
     const firestore = FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     const seasonDocs = firestore.getDocuments('accountingSeasons');
     if (seasonDocs.length === 0) return;

     // 毎回取得すると遅いため、マスタ類を一度に取得
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

       // このシーズンの精算データ計算
       const ranges = {
         winter: { s: `${year}.01.01`, e: `${year}.03.31` },
         spring: { s: `${year}.04.01`, e: `${year}.06.30` },
         summer: { s: `${year}.07.01`, e: `${year}.09.30` },
         autumn: { s: `${year}.10.01`, e: `${year}.12.31` }
       };
       const range = ranges[seasonKey];

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

       const notifications = []; // { toUid: string, msg: string } のリスト

       memberIds.forEach(uid => {
         const hasEvidence = s.evidenceUrls && s.evidenceUrls[uid] && s.evidenceUrls[uid].trim() !== "";
         if (hasEvidence) return;

         const contrib = userContrib[uid] || 0;
         const settlement = avg - contrib;

         if (settlement > 0) {
           // 支払（未入金者）: 本人へ催促（ただし担当者自身の自己支払催促はスキップ）
           if (uid === managerId) return;
            const msg = `お疲れ様です！Streak Navi コンシェルジュです🍀\n\n` +
                        `【バランス会計・お支払いのお願い】\n` +
                        `「${s.name}」の支払が確認できていません。リンクよりお支払いをお願いします。🙇‍♂️\n` +
                        `${BASE_URL}/accounting/confirm?seasonId=${s.id}`;
           notifications.push({ toUid: uid, msg: msg });
         } else if (settlement < 0) {
           // 受取（未受取証跡）: シーズン担当者へ催促
           const receiverName = userMap[uid] || "メンバー";
            const msg = `お疲れ様です！Streak Navi コンシェルジュです🍀\n\n` +
                        `【バランス会計・受取証跡アップロードのお願い】\n` +
                        `「${s.name}」の${receiverName}さんへの受取証明（スクショ）が未提出です。送金後スクショアップロードをお願いします。🙇‍♂️\n` +
                        `${BASE_URL}/accounting/confirm?seasonId=${s.id}`;
           notifications.push({ toUid: managerId, msg: msg });
         }
       });

       // 通知の送信
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
             Logger.log(`履歴保存完了 (個別): ${messageId}`);
           } catch (err) {
             Logger.log(`履歴保存エラー (個別): ${err.toString()}`);
           }
         }
       });
     });
   } catch (e) { Logger.log('Remind Error: ' + e.toString()); }
 }

 /**
  * イベント翌日に実行するリマインド関数
  * （※毎日1回定期実行するトリガーに登録してください）
  */
 function remindYesterdayEventExpenses() {
   try {
     const firestore = FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);
     const yesterday = new Date();
     yesterday.setDate(yesterday.getDate() - 1);
     const formattedYesterday = Utilities.formatDate(yesterday, "JST", "yyyy.MM.dd");

     // 昨日行われたイベントを取得
     const events = firestore.getDocuments('events').filter(d => {
       const obj = d.obj || d;
       return obj.date === formattedYesterday;
     });

     if (events.length === 0) return;

     events.forEach(d => {
       const e = d.obj || d;
       const eventId = d.name.split('/').pop();
       const eventTitle = e.title || "イベント";

       // 日付フォーマットの作成 (例: 5/30(土))
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
             if (prefObj && prefObj.name) {
               prefName = prefObj.name;
             }
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
           Logger.log(`履歴保存完了: ${messageId}`);
         } catch (err) {
           Logger.log(`履歴保存エラー: ${err.toString()}`);
         }
       }
     });
   } catch (e) { Logger.log('Event Remind Error: ' + e.toString()); }
 }

  /**
   * イベント後7日おきに、出席するが旅費補助申請が未提出かつイベント開催市区町村在住ではない人にリマインドする
   */
  function remindPendingTravelExpenses() {
    try {
      const firestore = FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);
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

      events.forEach(docRef => {
        const e = docRef.obj || docRef;
        if (!e.date) return;

        // 2026年5月以降のイベントのみを対象にする (yyyy.MM.dd 形式)
        if (e.date < "2026.05.01") return;

        // 日付のパース ("yyyy.MM.dd")
        const dateParts = e.date.split('.');
        if (dateParts.length !== 3) return;
        const eventDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
        
        const diffTime = today.getTime() - eventDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // イベント後7日おき（7日、14日、21日...）かつ過去90日以内のイベントを対象とする
        if (diffDays <= 0 || diffDays > 90 || diffDays % 7 !== 0) return;

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

        // 未提出の出席者を対象にする
        const pendingUids = attendees.filter(uid => !submittedUids.has(uid));

        pendingUids.forEach(uid => {
          try {
            // 居住地情報の取得 (users/{uid}/private/location)
            let userLoc = {};
            try {
              const locDoc = firestore.getDocument(`users/${uid}/private/location`);
              if (locDoc && locDoc.obj) {
                userLoc = locDoc.obj;
              }
            } catch (locErr) {
              Logger.log(`Failed to get location for user ${uid}: ` + locErr.toString());
            }

            const isLocationUnregistered = !userLoc.prefectureId || !userLoc.municipalityId;

            if (!isLocationUnregistered) {
              // イベント開催の市区町村と同じ在住の場合は対象外
              if (e.municipalityId && userLoc.municipalityId === e.municipalityId) {
                return;
              }
            }

            // 個別LINE通知の送信
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
                Logger.log(`履歴保存完了 (個別): ${messageId}`);
              } catch (err) {
                Logger.log(`履歴保存エラー (個別): ${err.toString()}`);
              }
            }
          } catch (uidErr) {
            Logger.log(`Error processing user ${uid} for event ${eventId}: ` + uidErr.toString());
          }
        });
      });
    } catch (e) {
      Logger.log('Remind Travel Expenses Error: ' + e.toString());
    }
  }

  function sendLinePush(to, messageText) {
    const isGroup = to.startsWith('C') || to === LINE_GROUP_ID;
    const token = isGroup ? LINE_GROUP_ACCESS_TOKEN : LINE_INDIV_ACCESS_TOKEN;
    if (!to || !token) return null;
    const payload = { to: to, messages: [{ type: 'text', text: messageText }] };
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': { 'Authorization': 'Bearer ' + token },
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