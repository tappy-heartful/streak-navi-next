import React from "react";

// フィルターの親
export const ListFilterGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="list-filter-grid">{children}</div>
);

// リストの行
export const ListRow = ({ children }: { children: React.ReactNode }) => (
  <tr>{children}</tr>
);

// セル：タイトル（リンク付き）
export const ListCellHeader = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <td className="list-table-row-header">
    <a href={href}>{children}</a>
  </td>
);

// セル：中央寄せ（譜面・音源など）
export const ListCellCenter = ({ children }: { children: React.ReactNode }) => (
  <td className="text-center">{children || "-"}</td>
);

// セル：ジャンル等（小文字・改行維持）
export const ListCellSmall = ({ children }: { children: React.ReactNode }) => (
  <td className="list-text-small">{children || "-"}</td>
);