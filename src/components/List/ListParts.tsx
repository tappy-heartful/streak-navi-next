import React from "react";
import Link from "next/link";

/** フィルター関連 **/
export const ListFilterGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="list-filter-grid">{children}</div>
);

// テキスト検索用
export const FilterInput = ({ 
  value, onChange, placeholder 
}: { value: string, onChange: (v: string) => void, placeholder: string }) => (
  <input 
    type="text" className="form-control" placeholder={placeholder} 
    value={value} onChange={(e) => onChange(e.target.value)} 
  />
);

// セレクトボックス用
export const FilterSelect = ({ 
  value, onChange, options, label 
}: { value: string, onChange: (v: string) => void, options: { id: string, name: string }[], label: string }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}>
    <option value="">{label}</option>
    {options.map((opt) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
  </select>
);

/** テーブルセル関連 **/
export const ListRow = ({ children }: { children: React.ReactNode }) => (
  <tr>{children}</tr>
);

// 内部リンク用（Next.jsのLinkを使用）
export const ListCellHeader = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <td className="list-table-row-header">
    <Link href={href}>{children}</Link>
  </td>
);

// 外部リンク（PDFやYouTube等）用
export const ListCellLink = ({ 
  href, icon, label 
}: { href?: string; icon: string; label: string }) => (
  <td className="text-center">
    {href ? (
      <a href={href} target="_blank" rel="noreferrer" className="list-external-link">
        <i className={icon}></i> {label}
      </a>
    ) : "-"}
  </td>
);

export const ListCellSmall = ({ children }: { children: React.ReactNode }) => (
  <td className="list-text-small">{children || "-"}</td>
);