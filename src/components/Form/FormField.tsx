import React from "react";

type Props = {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
};

/**
 * フォームのラベル、入力フィールド、エラーメッセージをセットにした共通コンポーネント
 */
export const FormField = ({ label, required, error, children }: Props) => {
  return (
    <div className="form-group">
      <label>
        {label} {required && <span className="required">*</span>}
      </label>
      {children}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};