/**
 * バリデーション用ユーティリティ
 */

// Google Drive URL (ファイルまたはフォルダ)
export const isValidGoogleDriveUrl = (url: string): boolean => {
  const pattern = /^https:\/\/drive\.google\.com\/(file\/d\/[\w\-]+\/view|drive\/folders\/[\w\-]+)/;
  return pattern.test(url);
};

// YouTube URL (通常URLまたは短縮URL)
export const isValidYouTubeUrl = (url: string): boolean => {
  const pattern = /^https:\/\/((www\.)?youtube\.com\/watch\?v=|youtu\.be\/)[\w\-]+/;
  return pattern.test(url);
};

// 必須チェック
export const isRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

// 文字数制限
export const isMaxLength = (value: string, max: number): boolean => {
  return value.length <= max;
};