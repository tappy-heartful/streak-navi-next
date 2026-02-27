"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { SearchableListReturn } from "@/src/hooks/useSearchableList";
import { useAuth } from "@/src/contexts/AuthContext";

type Props<T extends Record<string, any>, F extends Record<string, any>> = {
  title: string;
  icon?: string;
  basePath: string;
  list: SearchableListReturn<T, F>;
  searchFields: React.ReactNode;
  extraHeaderContent?: React.ReactNode;
  tableHeaders: string[];
  onSearch?: (filters: F) => void; // ★ これがある場合はボタンを表示し、手動実行モードになる
  children: React.ReactNode;
};

export const SearchableListLayout = <T extends Record<string, any>, F extends Record<string, any>>({
  title, icon, basePath, list, searchFields, extraHeaderContent, tableHeaders, onSearch, children
}: Props<T, F>) => {
  const { setBreadcrumbs } = useBreadcrumb();
  const { isAdmin } = useAuth();

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
          <button className="clear-button" onClick={list.resetFilters}>クリア</button>
          {/* ★ onSearch が渡されている時だけ「検索」ボタンを表示 */}
          {onSearch && (
            <button 
              className="save-button" 
              onClick={() => onSearch(list.filters)}
            >
              検索
            </button>
          )}
        </div>
      </div>

      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>{title} ({list.filteredData.length}件)</h3>
          {extraHeaderContent}
        </div>

        <div className="table-wrapper">
          <table className="list-table">
            <thead>
              <tr>
                {tableHeaders.map((header, i) => <th key={i}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {list.filteredData.length > 0 ? (
                children
              ) : (
                <tr>
                  <td colSpan={tableHeaders.length} className="text-center">
                    該当の{title}はありません🍀
                  </td>
                </tr>
              )}
            </tbody>
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