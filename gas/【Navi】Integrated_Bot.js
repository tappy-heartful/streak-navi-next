/**
 * ==============================================================================
 * STREAK NAVI 定期実行Bot (StreakNavi_Cron_Bot.js)
 * ==============================================================================
 * 
 * 【概要】
 * Swing Streak Jazz Orchestra (Streak Navi) 向け定期実行Cron Botです。
 * 外部ライブラリ（FirestoreApp等）やFirebase秘密鍵、LINEトークンをGAS側に一切持つことなく、
 * Next.js アプリの認証付きCronエンドポイント（/api/cron/daily, /api/cron/nightly）を
 * セキュアに呼び出して自動運用を行います。
 * 
 * 【処理内容】
 * 1. 日次定期通知 (runDailyNotifications):
 *    - イベント出欠・日程調整・投票・曲募集の案内 (全体LINE)
 *    - 会計シーズン終了翌日 (1/1, 4/1, 7/1, 10/1) の全体清算案内 (全体LINE)
 *    - 昨日イベントの経費申請・旅費補助案内 (全体LINE)
 *    - TODO期限前・超過リマインド (個別LINE)
 *    - 旅費補助未提出催促 (個別LINE)
 *    - 会計精算未入金・受取証跡リマインド (個別LINE ★金額・送金担当者をメッセージ内に表示)
 * 2. 夜間定期メンテナンス (runNightlyMaintenance):
 *    - 会計シーズンの自動作成 (四半期初日 1/1, 4/1, 7/1, 10/1)
 *    - 古いログの定期クリーンアップ (1,000件超過分削除)
 * 
 * ------------------------------------------------------------------------------
 * 【設定するトリガー（2つ）】
 * 1. runDailyNotifications : 【日ベースのタイマー】毎日 午前 9:00〜10:00 または 12:00〜13:00
 * 2. runNightlyMaintenance : 【日ベースのタイマー】毎日 深夜 0:00〜1:00 または 23:00〜0:00
 * 
 * 【スクリプトプロパティ（PropertiesService）の設定項目（合計2つのみ）】
 * GAS画面左メニューの歯車アイコン「プロジェクトの設定」→「スクリプト プロパティ」で登録します：
 * - BASE_URL    : Streak Navi の公開URL (例: https://streak-navi.vercel.app)
 * - CRON_SECRET : APIエンドポイント保護用の認証シークレットトークン（Vercelの環境変数と同一）
 * ==============================================================================
 */

// ==========================================
// 共通定数・スクリプトプロパティの取得
// ==========================================
const props = PropertiesService.getScriptProperties();
const BASE_URL = props.getProperty('BASE_URL') || "https://streak-navi.vercel.app";
const CRON_SECRET = props.getProperty('CRON_SECRET') || "";


// ==============================================================================
// トリガー関数 1: 朝 / 昼の各種通知実行 (runDailyNotifications)
// ==============================================================================
/**
 * 毎日朝・昼に実行するメイン関数
 * 推奨トリガー: 毎日 午前9:00〜10:00 または 12:00〜13:00
 */
function runDailyNotifications() {
  Logger.log('========== [昼/朝] 日次通知バッチ処理を開始します ==========');
  try {
    callCronApi("/api/cron/daily", false);
    Logger.log('========== [昼/朝] 日次通知バッチ処理 正常終了 ==========');
  } catch (err) {
    Logger.log('❌ 日次通知バッチ実行エラー: ' + err.toString());
  }
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
  try {
    callCronApi("/api/cron/nightly", false);
    Logger.log('========== [夜/深夜] 定期メンテナンス処理 正常終了 ==========');
  } catch (err) {
    Logger.log('❌ 定期メンテナンス実行エラー: ' + err.toString());
  }
}


// ==============================================================================
// 【テスト用関数】強制実行テストを行う関数
// ==============================================================================
/**
 * 日次通知のテスト実行（日付判定をスキップして即時検証）
 */
function testDailyExecution() {
  Logger.log('========== [テスト実行] 日次通知バッチ 開始 ==========');
  try {
    callCronApi("/api/cron/daily", true);
    Logger.log('========== [テスト実行] 日次通知バッチ 正常終了 ==========');
  } catch (err) {
    Logger.log('❌ 日次通知テストエラー: ' + err.toString());
  }
}

/**
 * 夜間メンテナンスのテスト実行
 */
function testNightlyExecution() {
  Logger.log('========== [テスト実行] 夜間メンテナンス 開始 ==========');
  try {
    callCronApi("/api/cron/nightly", true);
    Logger.log('========== [テスト実行] 夜間メンテナンス 正常終了 ==========');
  } catch (err) {
    Logger.log('❌ 夜間メンテナンステストエラー: ' + err.toString());
  }
}


// ==============================================================================
// Streak Navi Cron API 呼び出し処理
// ==============================================================================
/**
 * Streak Navi サーバーAPIを安全に呼び出す処理 (POST 送信)
 * @param {string} endpoint - APIパス (例: "/api/cron/daily")
 * @param {boolean} isForce - 日付判定等をスキップして強制実行するかどうか
 */
function callCronApi(endpoint, isForce) {
  const cleanBaseUrl = BASE_URL.replace(/\/$/, "");
  const url = cleanBaseUrl + endpoint + (isForce ? "?force=true" : "");
  Logger.log("APIエンドポイントを呼び出します: " + url);

  const headers = {
    "User-Agent": "StreakNavi-GAS-Cron-Bot/2.0",
    "Content-Type": "application/json",
  };
  if (CRON_SECRET) {
    headers["Authorization"] = "Bearer " + CRON_SECRET;
    headers["x-cron-secret"] = CRON_SECRET;
  }

  const options = {
    method: "POST",
    muteHttpExceptions: true,
    headers: headers,
    payload: JSON.stringify({ isForce: isForce, timestamp: new Date().toISOString() }),
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();

  Logger.log("HTTPステータスコード: " + statusCode);
  Logger.log("レスポンス内容: " + responseText);

  if (statusCode >= 200 && statusCode < 300) {
    let result = {};
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      result = { message: responseText };
    }

    Logger.log("✅ Cron処理が正常に実行されました！ 結果: " + JSON.stringify(result));
  } else {
    throw new Error("API呼び出しに失敗しました (HTTP " + statusCode + "): " + responseText);
  }
}
