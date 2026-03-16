"use client";

import { useState, useEffect } from "react";

export interface DialogOptions {
  message: string;
  isOKOnly?: boolean;
  resolve: (value: boolean) => void;
}

// グローバルに呼び出すためのsetterを保持
let setter: (options: DialogOptions | null) => void;

/**
 * プロミスを返すダイアログ表示関数
 * @param message 表示するテキスト
 * @param isOKOnly OKボタンのみにするかどうか
 */
export const showDialog = (message: string, isOKOnly = false): Promise<boolean> => {
  return new Promise((resolve) => {
    if (setter) {
      setter({ message, isOKOnly, resolve });
    }
  });
};

export default function CommonDialog() {
  const [options, setOptions] = useState<DialogOptions | null>(null);

  useEffect(() => {
    setter = setOptions;
  }, []);

  // オプションがない（ダイアログを閉じている）ときは何も描画しない
  if (!options) return null;

  const handleClose = (result: boolean) => {
    options.resolve(result);
    setOptions(null);
  };

  return (
    <div className="dialog-overlay">
      <style jsx>{`
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000; /* ヘッダーより上に表示 */
        }

        .dialog-box {
          background: white;
          padding: 24px;
          border-radius: 8px;
          width: 90%;
          max-width: 350px;
          min-width: 280px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        #dialog-message {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 24px;
          color: #333;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .dialog-buttons {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .dialog-buttons button {
          padding: 12px 24px;
          font-size: 16px;
          font-weight: bold;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          min-width: 100px;
          transition: opacity 0.2s;
        }

        .dialog-buttons button:active {
          opacity: 0.7;
        }

        .dialog-ok {
          background-color: #4CAF50;
          color: #fff;
        }

        .dialog-cancel {
          background-color: #ccc;
          color: #000;
        }
      `}</style>

      <div className="dialog-box">
        <p id="dialog-message">{options.message}</p>
        <div className="dialog-buttons">
          <button className="dialog-ok" onClick={() => handleClose(true)}>
            {options.isOKOnly ? "OK" : "はい"}
          </button>
          {!options.isOKOnly && (
            <button className="dialog-cancel" onClick={() => handleClose(false)}>
              いいえ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}