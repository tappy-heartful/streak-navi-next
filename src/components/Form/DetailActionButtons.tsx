"use client";

type Props = {
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  show: boolean; // 権限チェックの結果を渡す
};

export const DetailActionButtons = ({ onEdit, onCopy, onDelete, show }: Props) => {
  if (!show) return null;

  return (
    <div className="confirm-buttons">
      <button type="button" className="edit-button" onClick={onEdit}>
        編集
      </button>
      <button type="button" className="copy-button" onClick={onCopy}>
        コピー
      </button>
      <button type="button" className="delete-button" onClick={onDelete}>
        削除
      </button>
    </div>
  );
};