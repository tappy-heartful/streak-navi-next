import { db, auth } from "./firebase";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  runTransaction,
  DocumentReference,
  Query,
  QuerySnapshot,
  DocumentSnapshot,
  collection, 
  query, 
  where, 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { showDialog } from "@/src/components/CommonDialog"; // 先ほど作った共通ダイアログ

// --- 定数 ---
export const isTest = typeof window !== 'undefined' && window.location.hostname.includes('test');
export const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
export const globalAppName = isLocal ? 'streakNaviLocal' : isTest ? 'streakNaviTest' : 'streakNavi';
export const globalClientId = '2007808275';
export const globalLineDefaultImage = 'https://tappy-heartful.github.io/streak-images/navi/line-profile-unset.png';

// --- セッション管理 (localStorage/sessionStorage) ---
const getStorageKey = (key: string) => `${globalAppName}.${key}`;

export function setSession(key: string, value: any) {
  if (typeof window === 'undefined') return;
  const val = typeof value === 'string' ? value : JSON.stringify(value);
  sessionStorage.setItem(getStorageKey(key), val);
}

export function getSession(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(getStorageKey(key));
}

export function removeSession(key: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(getStorageKey(key));
}

export function clearAllAppSession() {
  if (typeof window === 'undefined') return;
  const prefix = globalAppName + '.';
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(prefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
}

// --- スピナー制御 (jQueryを使わず実装) ---
export function showSpinner() {
  if (typeof document === 'undefined') return;
  let overlay = document.getElementById('spinner-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'spinner-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
}

export function hideSpinner() {
  if (typeof document === 'undefined') return;
  const overlay = document.getElementById('spinner-overlay');
  if (overlay) overlay.style.display = 'none';
}

// --- Instagram 埋め込み用 ---
export function buildInstagramHtml(url: string, includeWrapper = true): string {
  if (!url) return '';
  const instaUrl = url.split('?')[0];
  const html = `<blockquote class="instagram-media" data-instgrm-permalink="${instaUrl}" data-instgrm-version="14"></blockquote>`;
  return includeWrapper ? `<div class="instagram-embed">${html}</div>` : html;
}



// 補助：extractYouTubeId も念のため安全にしておく
export function extractYouTubeId(input: string): string {
  if (!input) return ''; // nullやundefined対策
  try {
    if (input.includes('youtube.com') || input.includes('youtu.be')) {
      const url = new URL(input);
      return url.searchParams.get('v') || url.pathname.split('/').pop() || '';
    }
    return input; // URL形式でなければそのまま返す
  } catch {
    return input;
  }
}

export function buildYouTubeHtml(
  youtubeInput: string | string[], 
  showLink = true,
  showNotice = false,
): string {
  // 入力自体がない場合は空文字を返す
  if (!youtubeInput) return '';

  // 1. まず配列に統一して処理する
  const inputs = Array.isArray(youtubeInput) ? youtubeInput : [youtubeInput];

  // 2. IDを抽出。filterの中で id 自体が存在し、かつ長さが11であることを確認
  const videoIds = inputs
    .map(input => extractYouTubeId(input))
    .filter((id): id is string => !!id && id.length === 11); // ここで id の存在を確認

  // 抽出できたIDがない場合は終了
  if (videoIds.length === 0) return '';

  const embedId = videoIds[0];

  // 3. リンクの生成
  const youtubeLink = Array.isArray(youtubeInput) && videoIds.length > 1
    ? `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(',')}`
    : `https://www.youtube.com/watch?v=${embedId}`;

  return `
    <div class="youtube-embed-wrapper">
      <div class="youtube-embed">
        <iframe src="https://www.youtube.com/embed/${embedId}?loop=1&playlist=${embedId}" allowfullscreen></iframe>
      </div>
      <div class="youtube-link-container">
        ${showNotice ? `<span class="youtube-notice">🔒限定公開</span>` : ''}
        <a href="${youtubeLink}" target="_blank" rel="noopener noreferrer">
          ${!showLink ? '' : videoIds.length > 1 ? 'プレイリストを聴く' : 'YouTubeでみる'}
        </a>
      </div>
    </div>`;
}

// --- 日付操作 ---
export function formatDateToYMDDot(dateInput: any): string {
  if (!dateInput) return '';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

// --- ログ記録 ---
export async function writeLog({ dataId, action, status = 'success', errorDetail = {} }: any) {
  try {
    const uid = getSession('uid') || 'unknown';
    const timestamp = new Date().getTime();
    const logId = `${timestamp}_${uid}`;
    const colName = status === 'success' ? 'connectLogs' : 'connectErrorLogs';
    await setDoc(doc(db, colName, logId), {
      uid,
      action,
      dataId,
      status,
      errorDetail,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Log failed", e);
  }
}

export async function archiveAndDeleteDoc(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    // 削除前に 'archives' コレクションにコピー（履歴保存用）
    const archiveRef = doc(db, "archives", `${collectionName}_${docId}_${Date.now()}`);
    await setDoc(archiveRef, {
      ...snap.data(),
      archivedAt: serverTimestamp(),
      originalCollection: collectionName,
      originalId: docId
    });
    // 本番データを削除
    await deleteDoc(docRef);
  }
}
/**
 * DateオブジェクトまたはFirestoreのTimestampをフォーマット
 */
export function format(dateOrTimestamp: any, formatString = 'yyyy.MM.dd'): string {
  if (!dateOrTimestamp) return '';
  let date: Date;

  if (typeof dateOrTimestamp.toDate === 'function') {
    date = dateOrTimestamp.toDate();
  } else if (dateOrTimestamp instanceof Date) {
    date = dateOrTimestamp;
  } else if (dateOrTimestamp.seconds !== undefined) {
    date = new Date(dateOrTimestamp.seconds * 1000);
  } else if (typeof dateOrTimestamp === 'number') {
    date = new Date(dateOrTimestamp);
  } else if (typeof dateOrTimestamp === 'string') {
    date = new Date(dateOrTimestamp.replace(/\./g, '/'));
  } else {
    return '';
  }

  if (isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (formatString === 'yyyy.MM.dd') return `${year}.${month}.${day}`;
  if (formatString === 'MMdd') return `${month}${day}`;
  if (formatString === 'MM') return `${month}`;
  if (formatString === 'yyyy/MM/dd HH:mm') {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  }
  return `${year}.${month}.${day}`;
}

export function parseDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.split('.');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
  const date = new Date(y, m - 1, d);
  return (date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d) ? date : null;
}

/**
 * 期間内チェック
 */
export function isInTerm(startDateStr: string, endDateStr: string): boolean {
  const now = Date.now();
  const start = startDateStr ? new Date(startDateStr.replace(/\./g, '/') + ' 00:00:00').getTime() : 0;
  const end = endDateStr ? new Date(endDateStr.replace(/\./g, '/') + ' 23:59:59').getTime() : Infinity;
  return now >= start && now <= end;
}

export function buildGoogleDriveHtml(driveUrl: string, showNotice = false): string {
  const match = driveUrl?.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return '';
  return `
    <div class="drive-embed-wrapper">
      <div class="drive-embed">
        <iframe src="https://drive.google.com/file/d/${match[1]}/preview" allowfullscreen></iframe>
      </div>
      ${showNotice ? `<div class="drive-notice">🔒バンド内限定公開</div>` : ''}
    </div>`;
}

// --- プレイヤー補助ロジック ---

export function getWatchVideosOrder(currentIndex: number, items: any[]): string[] {
  const ids = items.map(n => n.youtubeId || extractYouTubeId(n.referenceTrack));
  return [...ids.slice(currentIndex), ...ids.slice(0, currentIndex)];
}

export function getRandomIndex(exclude: number, arrayLength: number): number {
  if (arrayLength <= 1) return 0;
  let idx;
  do { idx = Math.floor(Math.random() * arrayLength); } while (idx === exclude);
  return idx;
}

/**
 * React環境ではwindow.confirmはあまり使いませんが、
 * 忠実な再現のために残します。
 */
export function errorHandler(errorMessage: string) {
  hideSpinner();
  console.error('Error:', errorMessage);
  if (typeof window !== 'undefined' && confirm(`エラーが発生しました: ${errorMessage}\n画面をリロードしますか？`)) {
    window.location.reload();
  }
}

// すでに CommonDialog.tsx で export していますが、
// もし lib/functions.ts からも呼び出したい場合は再エクスポートしておくと便利です
export { showDialog };
// --- すでにあるコードの末尾に追記 ---

// Firestoreの純正関数を再エクスポート
export {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment, // これもよく使うので追加しておくと便利です
  writeBatch,
  runTransaction,
} from "firebase/firestore";

// 型定義も必要なら再エクスポート
export type {
  DocumentReference,
  Query,
  QuerySnapshot,
  DocumentSnapshot,
} from "firebase/firestore";

// 初期化した db インスタンスもエクスポート
export { db };

/**
 * "yyyy.MM.dd" または "yyyy-MM-dd" 形式の日付を表示用文字列に変換する
 * @param dateStr "2025.01.15" など
 * @param short true の場合は曜日のみ ("水")、false の場合は "1/15(水)"
 */
export function getDayOfWeek(dateStr: string, short = false): string {
  if (!dateStr) return "";
  const normalized = dateStr.replace(/-/g, ".");
  const parts = normalized.split(".");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dayStr = days[date.getDay()];
  if (short) return dayStr;
  return `${y}年${m}月${d}日(${dayStr})`;
}

/**
 * "yyyy.MM.dd" → "yyyy-MM-dd" (input[type=date] 用)
 */
export function dotDateToHyphen(dateStr: string): string {
  return dateStr?.replace(/\./g, "-") || "";
}

/**
 * "yyyy-MM-dd" → "yyyy.MM.dd" (Firestore保存用)
 */
export function hyphenDateToDot(dateStr: string): string {
  return dateStr?.replace(/-/g, ".") || "";
}