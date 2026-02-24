import { useEffect, useState } from "react";
import { showDialog } from "../CommonDialog";

type Props = {
  mode: "new" | "edit" | "copy";
  onSave: () => void;
  confirmMessage?: string;
};

export const FormButtons = ({ mode, onSave, confirmMessage = "入力内容をクリアしてもよろしいですか？" }: Props) => {
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    // クライアントサイドでのみURLを取得
    setCurrentUrl(window.location.pathname + window.location.search);
  }, []);

  return (
    <div className="confirm-buttons">
      <button 
      className="clear-button" 
      onClick={async () => {
          if (await showDialog(confirmMessage)) {
            window.location.reload();
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