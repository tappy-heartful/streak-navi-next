"use client";

import { useState, useEffect } from "react";

export interface DialogOptions {
  message: string;
  isOKOnly?: boolean;
  isPrompt?: boolean;
  promptPlaceholder?: string;
  resolve: (value: boolean | string | null) => void;
}

// グローバルに呼び出すためのsetterを保持
let setter: (options: DialogOptions | null) => void;

/**
 * プロミスを返すダイアログ表示関数
 * @param message 表示するテキスト
 * @param isOKOnly OKボタンのみにするかどうか
 * @param isPrompt 入力フィールドを表示するかどうか
 * @param promptPlaceholder 入力フィールドのプレースホルダー
 */
export const showDialog = (
  message: string, 
  isOKOnly = false, 
  isPrompt = false, 
  promptPlaceholder = ""
): Promise<boolean | string | null> => {
  return new Promise((resolve) => {
    if (setter) {
      setter({ message, isOKOnly, isPrompt, promptPlaceholder, resolve });
    }
  });
};

export default function CommonDialog() {
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    setter = setOptions;
  }, []);

  useEffect(() => {
    if (options?.isPrompt) {
      setPromptValue("");
    }
  }, [options]);

  // オプションがない（ダイアログを閉じている）ときは何も描画しない
  if (!options) return null;

  const handleClose = (result: boolean) => {
    if (options.isPrompt) {
      if (result) {
        options.resolve(promptValue);
      } else {
        options.resolve(null);
      }
    } else {
      options.resolve(result);
    }
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
          z-index: 10000;
        }

        .dialog-box {
          background: white;
          padding: 24px;
          border-radius: 8px;
          width: 90%;
          max-width: 400px;
          min-width: 280px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        #dialog-message {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 20px;
          color: #333;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .dialog-prompt-input {
          width: 100%;
          padding: 10px;
          margin-bottom: 20px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 16px;
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
        <div style={{ marginBottom: '12px', color: '#d4af37', fontSize: '24px' }}>
          <i className="fa-solid fa-music"></i>
        </div>
        <p id="dialog-message">{options.message}</p>
        
        {options.isPrompt && (
          <input
            type="text"
            className="dialog-prompt-input"
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            placeholder={options.promptPlaceholder}
            autoFocus
          />
        )}

        <div className="dialog-buttons">
          <button className="dialog-ok" onClick={() => handleClose(true)}>
            {options.isOKOnly ? "OK" : (options.isPrompt ? "送信" : "はい")}
          </button>
          {!options.isOKOnly && (
            <button className="dialog-cancel" onClick={() => handleClose(false)}>
              {options.isPrompt ? "キャンセル" : "いいえ"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}