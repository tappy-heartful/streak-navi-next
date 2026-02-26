"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { SearchableListReturn } from "@/src/hooks/useSearchableList";

type Props<T extends Record<string, any>, F extends Record<string, any>> = {
  title: string;
  icon?: string;
  basePath: string;
  isAdmin: boolean;
  list: SearchableListReturn<T, F>; // フックの結果を丸ごと受け取る
  searchFields: React.ReactNode;
  extraHeaderContent?: React.ReactNode;
  tableHeaders: string[];
  children: React.ReactNode; // <tr> の中身（データがある場合）
};

export const SearchableListLayout = <T extends Record<string, any>, F extends Record<string, any>>({
  title, icon, basePath, isAdmin, list, searchFields, extraHeaderContent, tableHeaders, children
}: Props<T, F>) => {
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
        {/* ユーザー指定のボタン構造をここに集約 */}
        <div className="confirm-buttons">
          <button className="clear-button" onClick={list.resetFilters}>クリア</button>
          <button className="save-button">検索</button> {/* フィルタは自動で走る想定 */}
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