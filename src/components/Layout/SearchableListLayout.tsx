"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";

type Props = {
  title: string;
  icon?: string;
  basePath: string;
  count: number;
  isAdmin: boolean;
  searchFields: React.ReactNode;
  extraHeaderContent?: React.ReactNode;
  onClear: () => void;
  onSearch?: () => void; // 検索ボタン用（自動フィルタなら空でもOK）
  tableHeaders: string[];
  children: React.ReactNode;
};

export const SearchableListLayout = ({
  title, icon, basePath, count, isAdmin, searchFields, extraHeaderContent, onClear, onSearch, tableHeaders, children
}: Props) => {
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbs([{ title: `${title}一覧` }]);
  }, [setBreadcrumbs, title]);

  return (
    <main>
      <div className="page-header">
        <h1>{icon && <i className={icon}></i>} {title}一覧</h1>
      </div>

      <div className="container">
        <h3>検索</h3>
        {searchFields}
        <div className="confirm-buttons">
          <button className="clear-button" onClick={onClear}>クリア</button>
          <button className="save-button" onClick={onSearch}>検索</button>
        </div>
      </div>

      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>{title} ({count}件)</h3>
          {extraHeaderContent}
        </div>

        <div className="table-wrapper">
          <table className="list-table">
            <thead>
              <tr>
                {tableHeaders.map((header, i) => <th key={i}>{header}</th>)}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>

        {isAdmin && (
          <Link href={`${basePath}/edit?mode=new`} className="list-add-button" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            ＋ 新規作成
          </Link>
        )}
      </div>

      <div className="page-footer">
        <Link href="/home" className="back-link">← ホームに戻る</Link>
      </div>
    </main>
  );
};