import Link from "next/link";
import { useEffect, useState } from "react";

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

  const handleClearClick = (e: React.MouseEvent) => {
    if (!confirm(confirmMessage)) {
      e.preventDefault();
    }
  };

  return (
    <div className="confirm-buttons">
      <Link 
        href={currentUrl} 
        className="clear-button" 
        prefetch={false}
        onClick={handleClearClick}
      >
        クリア
      </Link>
      <button type="button" className="save-button" onClick={onSave}>
        {mode === "edit" ? "更新" : "登録"}
      </button>
    </div>
  );
};