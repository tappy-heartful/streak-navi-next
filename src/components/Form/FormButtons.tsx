"use client";

import { useEffect, useState } from "react";
import { showDialog } from "../CommonDialog";

type Props = {
  mode: "new" | "edit" | "copy";
  onSave: () => void;
  onClear: () => void; // ★ 追加
  confirmMessage?: string;
};

export const FormButtons = ({ 
  mode, 
  onSave, 
  onClear, // ★ 追加 
  confirmMessage = "入力内容をクリアしてもよろしいですか？" 
}: Props) => {
  // ※現在の実装で不要であれば currentUrl の state と useEffect は削除しても問題ありません
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setCurrentUrl(window.location.pathname + window.location.search);
  }, []);

  return (
    <div className="confirm-buttons">
      <button 
        type="button" // 明示的に button type を指定
        className="clear-button" 
        onClick={async () => {
          if (await showDialog(confirmMessage)) {
            // ★ リロードではなく、親から渡されたリセット処理を実行
            onClear();
          }
        }}
      >
        クリア
      </button>
      <button type="button" className="save-button" onClick={onSave}>
        {mode === "edit" ? "更新" : "登録"}
      </button>
    </div>
  );
};