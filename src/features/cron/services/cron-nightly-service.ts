import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";
import { getJSTDate } from "@/src/lib/functions";
import { AccountingSeasonKey } from "@/src/lib/firestore/types";

// ログ保存の上限件数設定
const MAX_LIMITS: Record<string, number> = {
  accessLogs: 1000,
  logs: 1000,
  errorLogs: 1000,
  connectLogs: 1000,
  connectErrorLogs: 1000,
};

export interface NightlyCronResult {
  success: boolean;
  timestamp: string;
  isForce: boolean;
  newSeasonCreated: boolean;
  createdSeasonId?: string;
  cleanedLogsCount: Record<string, number>;
  logs: string[];
}

/**
 * 夜間定期メンテナンス処理実行（深夜）
 */
export async function runNightlyCronTasks(isForce = false): Promise<NightlyCronResult> {
  const nowJst = getJSTDate();
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[NightlyCron] ${msg}`);
    logs.push(msg);
  };

  log(`夜間定期メンテナンス処理を開始します (isForce: ${isForce})`);

  let newSeasonCreated = false;
  let createdSeasonId: string | undefined;
  const cleanedLogsCount: Record<string, number> = {};

  // 1. 会計シーズンの自動作成 (四半期初日 1/1, 4/1, 7/1, 10/1)
  try {
    log("--- 1. 会計シーズン自動作成処理開始 ---");
    const seasonRes = await autoCreateAccountingSeason(nowJst, isForce, log);
    newSeasonCreated = seasonRes.created;
    createdSeasonId = seasonRes.seasonId;
  } catch (err: any) {
    log(`❌ autoCreateAccountingSeason エラー: ${err.message}`);
  }

  // 2. 古いログの定期クリーンアップ (1,000件超過分削除)
  try {
    log("--- 2. 古いログの定期クリーンアップ開始 ---");
    const cleanRes = await cleanAllOldLogs(log);
    Object.assign(cleanedLogsCount, cleanRes);
  } catch (err: any) {
    log(`❌ cleanAllOldLogs エラー: ${err.message}`);
  }

  log("夜間定期メンテナンス処理が正常に完了しました。");

  return {
    success: true,
    timestamp: new Date().toISOString(),
    isForce,
    newSeasonCreated,
    createdSeasonId,
    cleanedLogsCount,
    logs,
  };
}

/**
 * 1. 会計シーズンの自動作成
 */
async function autoCreateAccountingSeason(
  nowJst: Date,
  isForce: boolean,
  log: (m: string) => void
): Promise<{ created: boolean; seasonId?: string }> {
  const year = nowJst.getUTCFullYear();
  const month = nowJst.getUTCMonth() + 1;
  const date = nowJst.getUTCDate();

  // 四半期初日（1/1, 4/1, 7/1, 10/1）のみ実行（isForce 時は現在の月に応じたシーズンを作成試行）
  if (date !== 1 && !isForce) {
    log(`本日は ${month}/${date} のため、四半期初日ではありません。スキップします。`);
    return { created: false };
  }

  let seasonKey: AccountingSeasonKey | "" = "";
  let endDateStr = "";
  let seasonName = "";

  if (month >= 1 && month <= 3) {
    seasonKey = "winter"; endDateStr = `${year}.03.31`; seasonName = `${year}年 冬`;
  } else if (month >= 4 && month <= 6) {
    seasonKey = "spring"; endDateStr = `${year}.06.30`; seasonName = `${year}年 春`;
  } else if (month >= 7 && month <= 9) {
    seasonKey = "summer"; endDateStr = `${year}.09.30`; seasonName = `${year}年 夏`;
  } else if (month >= 10 && month <= 12) {
    seasonKey = "autumn"; endDateStr = `${year}.12.31`; seasonName = `${year}年 秋`;
  }

  if (!seasonKey) return { created: false };

  const seasonId = `${year}-${seasonKey}`;
  const docRef = adminDb.collection("accountingSeasons").doc(seasonId);
  const existingDoc = await docRef.get();

  if (existingDoc.exists) {
    log(`[会計シーズン作成] シーズン ${seasonId} はすでに存在します。`);
    return { created: false, seasonId };
  }

  // ユーザー一覧を取得して全メンバーを登録
  const usersSnap = await adminDb.collection("users").get();
  const memberIds = usersSnap.docs.map(d => d.id);

  const newSeasonData = {
    id: seasonId,
    year,
    seasonKey,
    name: `${seasonName}シーズン`,
    memberIds,
    endDate: endDateStr,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await docRef.set(newSeasonData);
  log(`[会計シーズン作成] 新シーズン ${seasonId} を自動作成しました。(メンバー数: ${memberIds.length}名)`);

  return { created: true, seasonId };
}

/**
 * 2. 古いログの定期クリーンアップ (1,000件超過分削除)
 */
async function cleanAllOldLogs(log: (m: string) => void): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  for (const [collectionName, maxLimit] of Object.entries(MAX_LIMITS)) {
    try {
      const snap = await adminDb.collection(collectionName).get();
      if (snap.empty || snap.docs.length <= maxLimit) {
        result[collectionName] = 0;
        continue;
      }

      const totalCount = snap.docs.length;
      log(`[${collectionName}] 現在 ${totalCount} 件存在（上限: ${maxLimit}件）`);

      // 作成日時で降順ソート
      const formattedDocs = snap.docs.map(doc => {
        const data = doc.data();
        let timestamp = 0;
        if (data.createdAt?.toMillis) {
          timestamp = data.createdAt.toMillis();
        } else if (data.createdAt instanceof Date) {
          timestamp = data.createdAt.getTime();
        } else if (typeof data.createdAt === "number") {
          timestamp = data.createdAt;
        } else if (data.sentAt) {
          timestamp = typeof data.sentAt === "number" ? data.sentAt : new Date(data.sentAt).getTime();
        }
        return {
          id: doc.id,
          ref: doc.ref,
          timestamp,
        };
      });

      formattedDocs.sort((a, b) => b.timestamp - a.timestamp);
      const docsToDelete = formattedDocs.slice(maxLimit);

      // Firestore の batch 削除（最大500件ずつ）
      let deleted = 0;
      for (let i = 0; i < docsToDelete.length; i += 400) {
        const chunk = docsToDelete.slice(i, i + 400);
        const batch = adminDb.batch();
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
        deleted += chunk.length;
      }

      result[collectionName] = deleted;
      log(`[${collectionName}] 上限を超過した古いログ ${deleted} 件を削除しました。`);
    } catch (err: any) {
      log(`❌ [${collectionName}] クリーンアップエラー: ${err.message}`);
      result[collectionName] = 0;
    }
  }

  return result;
}

