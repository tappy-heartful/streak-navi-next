"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useAuth } from "@/src/contexts/AuthContext";

type Props = {
  title: string;
  icon?: string;
  basePath: string;
  count?: number;
  hideAddButton?: boolean;
  children: React.ReactNode;
};

/**
 * 検索機能を省いた、グループ表示ベースのシンプルな一覧画面レイアウト
 */
export const ListBaseLayout = ({ title, icon, basePath, count, hideAddButton, children }: Props) => {
  const { setBreadcrumbs } = useBreadcrumb();
  const { isAdmin } = useAuth();

  useEffect(() => {
    setBreadcrumbs([{ title: `${title}一覧` }]);
  }, [setBreadcrumbs, title]);

  return (
    <main>
      <div className="page-header">
        <h1>{icon && <i className={icon}></i>} {title}一覧 {count !== undefined && `(${count}件)`}</h1>
      </div>

      <div className="container" id={`${btoa(basePath)}-list-container`}>
        {children}

        {isAdmin && !hideAddButton && (
          <Link href={`${basePath}/edit?isInit=true`} className="list-add-button" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: "2rem" }}>
            ＋ 新規{title}作成
          </Link>
        )}
      </div>

      <div className="page-footer">
        <Link href="/home" className="back-link">← ホームに戻る</Link>
      </div>
    </main>
  );
};
