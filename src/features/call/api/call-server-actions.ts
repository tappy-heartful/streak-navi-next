import 'server-only';
import { adminDb } from "@/src/lib/firebase-admin";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { Call, CallAnswer, CallAnswerSong, ScoreStatus } from "@/src/lib/firestore/types";

/**
 * 譜面ステータス一覧を取得（ID順）
 */
export async function getScoreStatusesServer(): Promise<ScoreStatus[]> {
  const snap = await adminDb.collection("scoreStatus").orderBy("__name__").get();
  return snap.docs.map(toPlainObject) as ScoreStatus[];
}

/**
 * 曲募集一覧を取得（作成日時降順）
 */
export async function getCallsServer(): Promise<Call[]> {
  const snap = await adminDb.collection("calls").orderBy("createdAt", "desc").get();
  return snap.docs.map(toPlainObject) as Call[];
}

/**
 * callAnswers の全ドキュメントIDを取得
 * リスト画面で参加者数・自分の回答状況を判定するために使用
 */
export async function getCallAnswerIdsServer(): Promise<string[]> {
  const snap = await adminDb.collection("callAnswers").get();
  return snap.docs.map(doc => doc.id);
}

/**
 * 特定の曲募集をIDで取得
 */
export async function getCallServer(callId: string): Promise<Call | null> {
  const docSnap = await adminDb.collection("calls").doc(callId).get();
  if (!docSnap.exists) return null;
  return toPlainObject(docSnap) as Call;
}

/**
 * 確認画面用: 特定募集の全回答・ユーザー名・譜面ステータスをまとめて取得
 */
export async function getCallConfirmDataServer(callId: string): Promise<{
  callAnswers: CallAnswer[];
  usersMap: Record<string, string>;
  scoreStatusMap: Record<string, string>;
}> {
  // callId に紐づく回答を取得（ID が "{callId}_{uid}" の形式）
  const answersSnap = await adminDb.collection("callAnswers").get();
  const matchingDocs = answersSnap.docs.filter(doc => doc.id.startsWith(callId + "_"));

  const callAnswers: CallAnswer[] = matchingDocs.map(doc => ({
    id: doc.id,
    uid: doc.data().uid as string,
    answers: (doc.data().answers || {}) as { [genre: string]: CallAnswerSong[] },
  }));

  // 回答者のユニークな uid を収集
  const uids = [...new Set(callAnswers.map(a => a.uid).filter(Boolean))];

  // 回答内の scoreStatus ID を収集
  const scoreStatusIds = new Set<string>();
  callAnswers.forEach(ans => {
    Object.values(ans.answers).forEach(songs => {
      songs.forEach(song => {
        if (song.scorestatus) scoreStatusIds.add(song.scorestatus);
      });
    });
  });

  // ユーザー名・scoreStatus を並列取得
  const [userDocs, scoreStatusDocs] = await Promise.all([
    Promise.all(uids.map(uid => adminDb.collection("users").doc(uid).get())),
    Promise.all([...scoreStatusIds].map(id => adminDb.collection("scoreStatus").doc(id).get())),
  ]);

  const usersMap: Record<string, string> = {};
  userDocs.forEach(doc => {
    if (doc.exists) usersMap[doc.id] = doc.data()?.displayName || "(不明)";
  });

  const scoreStatusMap: Record<string, string> = {};
  scoreStatusDocs.forEach(doc => {
    if (doc.exists) scoreStatusMap[doc.id] = doc.data()?.name || "";
  });

  return { callAnswers, usersMap, scoreStatusMap };
}
