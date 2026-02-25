"use client";

import React, { useEffect } from "react";
import { FormFooter } from "../Form/FormFooter";
import { DetailActionButtons } from "../Form/DetailActionButtons";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";

type Props = {
  name: string;      // "譜面", "イベント" など
  backHref: string;  // "/score", "/event" など
  onEdit?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
};

/**
 * 確認（詳細）画面専用の共通レイアウト
 * パンくずリストの設定、権限に応じたアクションボタンの表示を自動化
 */
export const ConfirmLayout = ({ 
  name, 
  backHref, 
  onEdit,
  onCopy,
  onDelete,
  children 
}: Props) => {
  const { isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  // パンくずリストの設定を吸収
  useEffect(() => {
    setBreadcrumbs([
      { title: `${name}一覧`, href: backHref },
      { title: `${name}確認`, href: "" },
    ]);
  }, [setBreadcrumbs, name, backHref]);

  return (
    <>
      <div className="page-header">
        <h1>{name}確認</h1>
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

      <FormFooter backHref={backHref} backText={`${name}一覧`} />
    </>
  );
};