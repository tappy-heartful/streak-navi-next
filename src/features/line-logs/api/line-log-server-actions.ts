"use server";

import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";
import { LineLogConfig } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * LINE送信ログ設定 (configs/lineLogs) を取得する
 */
export async function getLineLogConfigServer(): Promise<LineLogConfig> {
  try {
    const doc = await adminDb.collection("configs").doc("lineLogs").get();
    if (!doc.exists) {
      return { groupMemberCount: 1 };
    }
    const data = doc.data()!;
    return {
      groupMemberCount: typeof data.groupMemberCount === "number" ? data.groupMemberCount : 1,
      updatedAt: data.updatedAt ? (data.updatedAt.toMillis ? data.updatedAt.toMillis() : Number(data.updatedAt)) : undefined,
      updatedBy: data.updatedBy || "",
    };
  } catch (err) {
    console.error("Failed to get lineLogs config on server:", err);
    return { groupMemberCount: 1 };
  }
}

/**
 * LINE送信ログ設定 (configs/lineLogs) を保存する (管理者専用)
 */
export async function saveLineLogConfigAction(
  count: number,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof count !== "number" || count < 1) {
      return { success: false, error: "人数は1人以上で入力してください。" };
    }

    // ユーザー権限チェック
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return { success: false, error: "ユーザーが存在しません。" };
    }
    const userData = userDoc.data()!;
    const hasPermission =
      userData.isSystemAdmin === true ||
      userData.isNoticeAdmin === true ||
      userData.isLineLogAdmin === true;

    if (!hasPermission) {
      return { success: false, error: "設定を変更する権限がありません。" };
    }

    await adminDb.collection("configs").doc("lineLogs").set(
      {
        groupMemberCount: count,
        updatedAt: Date.now(),
        updatedBy: userId,
      },
      { merge: true }
    );

    return { success: true };
  } catch (err: any) {
    console.error("Failed to save lineLogs config:", err);
    return { success: false, error: err.message || "設定の保存に失敗しました。" };
  }
}
