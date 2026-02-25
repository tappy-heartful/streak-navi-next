"use client";

import React from "react";
import { FormFooter } from "../Form/FormFooter";
import { DetailActionButtons } from "../Form/DetailActionButtons";
import { useAuth } from "@/src/contexts/AuthContext";

type Props = {
  title: string;
  backHref: string;
  backText: string;
  // ボタン関連のプロップスを追加
  showButtons?: boolean;
  onEdit?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
};

export const ConfirmLayout = ({ 
  title, 
  backHref, 
  backText, 
  onEdit,
  onCopy,
  onDelete,
  children 
}: Props) => {

  const { isAdmin } = useAuth();
  return (
    <>
      <div className="page-header">
        <h1>{title}</h1>
      </div>

      <div className="container">
        {children}
        
        {/* ボタンの表示ロジックを共通レイアウト側に集約 */}
        {isAdmin && onEdit && onCopy && onDelete && (
          <DetailActionButtons 
            show={isAdmin}
            onEdit={onEdit}
            onCopy={onCopy}
            onDelete={onDelete}
          />
        )}
      </div>

      <FormFooter backHref={backHref} backText={backText} />
    </>
  );
};