"use client";

import { useState, useEffect, useRef } from "react";

interface ModalOptions {
  title: string;
  body: string;
  saveLabel?: string;
  cancelLabel?: string;
  resolve: (value: any) => void;
}

let modalSetter: (options: ModalOptions | null) => void;

/**
 * モーダル表示関数
 * @returns 保存時は { success: true, data: { id: value } }、キャンセル時は false
 */
export const showModal = (
  title: string,
  body: string,
  saveLabel?: string,
  cancelLabel?: string
): Promise<any> => {
  return new Promise((resolve) => {
    if (modalSetter) {
      modalSetter({ title, body, saveLabel, cancelLabel, resolve });
    }
  });
};

export default function CommonModal() {
  const [options, setOptions] = useState<ModalOptions | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modalSetter = setOptions;
  }, []);

  if (!options) return null;

  const handleClose = (result: any) => {
    options.resolve(result);
    setOptions(null);
  };

  const handleSave = () => {
    if (!bodyRef.current) return;

    // 以前のjQueryロジックを再現：body内のidを持つ要素から値を取得
    const formData: Record<string, any> = {};
    const elements = bodyRef.current.querySelectorAll("[id]");

    elements.forEach((el: any) => {
      const id = el.id;
      let value;

      if (el.type === "checkbox") {
        value = el.checked;
      } else if (el.type === "radio") {
        if (el.checked) {
          value = el.value;
        } else {
          return; // チェックされていないラジオはスキップ
        }
      } else {
        value = el.value;
      }
      formData[id] = value;
    });

    handleClose({ success: true, data: formData });
  };

  return (
    <div className="modal" onClick={(e) => {
      // 背景クリックでキャンセル
      if ((e.target as HTMLElement).classList.contains("modal")) handleClose(false);
    }}>
      <style jsx>{`
        .modal {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 10000;
        }
        .modal-content {
          background: #fff;
          border-radius: 8px;
          width: 90%;
          max-width: 768px;
          max-height: 85%;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          animation: fadeInUp 0.2s ease-out;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .modal-header {
          flex-shrink: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #ddd;
          font-weight: bold;
          font-size: 18px;
        }
        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #fff;
          line-height: 1.6;
        }
        .confirm-buttons {
          flex-shrink: 0;
          padding: 16px;
          background: #f9f9f9;
          border-top: 1px solid #ddd;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
          padding: 0;
          line-height: 1;
        }
        .save-button {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
        }
        .cancel-button {
          background-color: #ccc;
          color: #333;
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
        }
      `}</style>

      <div className="modal-content">
        <div className="modal-header">
          <span className="modal-title">{options.title}</span>
          <button className="modal-close" onClick={() => handleClose(false)}>×</button>
        </div>
        
        <div 
          className="modal-body" 
          ref={bodyRef}
          dangerouslySetInnerHTML={{ __html: options.body }} 
        />

        {(options.saveLabel || options.cancelLabel) && (
          <div className="confirm-buttons">
            {options.cancelLabel && (
              <button className="cancel-button" onClick={() => handleClose(false)}>
                {options.cancelLabel}
              </button>
            )}
            {options.saveLabel && (
              <button className="save-button" onClick={handleSave}>
                {options.saveLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}