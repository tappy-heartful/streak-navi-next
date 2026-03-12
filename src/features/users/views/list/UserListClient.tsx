"use client";

import { useSearchableList } from "@/src/hooks/useSearchableList";
import { SearchableListLayout } from "@/src/components/Layout/SearchableListLayout";
import { User, Section, Role, Instrument, SecretWord } from "@/src/lib/firestore/types";
import { userFilterFn, userSortFn, UserFilters } from "@/src/features/users/lib/user-search-engine";
import {
  ListFilterGrid, FilterInput, FilterSelect,
  ListRow, ListCellHeader
} from "@/src/components/List/ListParts";
import { globalLineDefaultImage, format } from "@/src/lib/functions";
import React from "react";

type Props = {
  initialData: {
    users: User[];
    sections: Section[];
    roles: Role[];
    instruments: Instrument[];
    secretWords: SecretWord[];
  };
};

export function UserListClient({ initialData }: Props) {
  const { users, sections, roles, instruments, secretWords } = initialData;

  const list = useSearchableList<User, UserFilters>(
    users,
    { search: "", sectionId: "", sort: "section-role" },
    userFilterFn,
    userSortFn
  );

  // 補助関数群
  const getRoleName = (roleId?: string) => 
    roles.find(r => r.id === roleId)?.name ?? "-";

  const getInstrumentNames = (instIds?: string[]) => {
    if (!instIds || instIds.length === 0) return "-";
    return instIds
      .map(id => instruments.find(i => i.id === id)?.name)
      .filter(Boolean)
      .join("、");
  };

  const getAdminRoles = (user: User) => {
    const admins = secretWords
      .filter(sw => user[sw.roleField])
      .map(sw => sw.label);
    return admins.length > 0 ? admins.join("、") : "-";
  };

  // セクションごとにグループ化して表示するための処理
  // 選択されたセクションがあればそれだけ、なければ全セクション
  const displaySections = list.filters.sectionId 
    ? sections.filter(s => s.id === list.filters.sectionId)
    : sections;

  return (
    <SearchableListLayout
      title="ユーザ" icon="fa-solid fa-users" basePath="/user"
      list={list}
      tableHeaders={["氏名", "略称", "楽器", "役職", "権限", "最終ログイン"]}
      searchFields={
        <ListFilterGrid>
          <FilterInput
            placeholder="名前、略称で検索..."
            value={list.filters.search}
            onChange={(v) => list.updateFilter("search", v)}
          />
          <FilterSelect
            label="パートを選択"
            options={sections}
            value={list.filters.sectionId}
            onChange={(v) => list.updateFilter("sectionId", v)}
          />
          {!list.filters.sectionId && (
            <FilterSelect
              label="並び替え"
              options={[
                { id: "section-role", name: "パート・役職順" },
                { id: "createdAt-desc", name: "登録日が新しい順" },
                { id: "lastLoginAt-desc", name: "最近ログインした順" },
              ]}
              value={list.filters.sort}
              onChange={(v) => list.updateFilter("sort", v)}
            />
          )}
        </ListFilterGrid>
      }
    >
      {/* 
        SearchableListLayout は table要素 を提供するため、
        tbody の中身（tr -> ListRow）を返す必要がある。
        今回はセクションごとに見出し行（tr）を挟む形で実装する。
      */}
      {displaySections.map(section => {
        const sectionUsers = list.filteredData.filter(u => u.sectionId === section.id);
        if (sectionUsers.length === 0) return null;

        return (
          <React.Fragment key={section.id}>
            <tr style={{ backgroundColor: "#f8f9fa" }}>
              <td colSpan={6} style={{ fontWeight: "bold", padding: "0.75rem 1rem", borderTop: "2px solid #ddd" }}>
                {section.name} (計 {sectionUsers.length}名)
              </td>
            </tr>
            {sectionUsers.map((u) => (
              <ListRow key={u.id}>
                <ListCellHeader href={`/user/confirm?uid=${u.id}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <img 
                      src={u.pictureUrl || globalLineDefaultImage} 
                      alt="icon" 
                      style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).src = globalLineDefaultImage; }}
                    />
                    <span>{u.displayName || "名無し"}</span>
                  </div>
                </ListCellHeader>
                <td>{u.abbreviation || "-"}</td>
                <td style={{ fontSize: "0.85rem" }}>{getInstrumentNames(u.instrumentIds)}</td>
                <td>{getRoleName(u.roleId)}</td>
                <td style={{ fontSize: "0.85rem", color: "#666" }}>{getAdminRoles(u)}</td>
                <td style={{ fontSize: "0.85rem", color: "#666" }}>
                  {u.lastLoginAt ? format(u.lastLoginAt, 'yyyy.MM.dd') : "-"}
                </td>
              </ListRow>
            ))}
          </React.Fragment>
        );
      })}

      {/* 未設定のユーザー */}
      {(() => {
        const unknownUsers = list.filteredData.filter(u => !u.sectionId);
        if (unknownUsers.length === 0) return null;
        
        return (
          <React.Fragment key="unknown">
            <tr style={{ backgroundColor: "#fff3cd" }}>
              <td colSpan={6} style={{ fontWeight: "bold", padding: "0.75rem 1rem", borderTop: "2px solid #ddd", color: "#856404" }}>
                パート未設定 (計 {unknownUsers.length}名)
              </td>
            </tr>
            {unknownUsers.map((u) => (
              <ListRow key={u.id}>
                <ListCellHeader href={`/user/confirm?uid=${u.id}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <img 
                      src={u.pictureUrl || globalLineDefaultImage} 
                      alt="icon" 
                      style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).src = globalLineDefaultImage; }}
                    />
                    <span>{u.displayName || "名無し"}</span>
                  </div>
                </ListCellHeader>
                <td>{u.abbreviation || "-"}</td>
                <td style={{ fontSize: "0.85rem" }}>{getInstrumentNames(u.instrumentIds)}</td>
                <td>{getRoleName(u.roleId)}</td>
                <td style={{ fontSize: "0.85rem", color: "#666" }}>{getAdminRoles(u)}</td>
                <td style={{ fontSize: "0.85rem", color: "#666" }}>
                  {u.lastLoginAt ? format(u.lastLoginAt, 'yyyy.MM.dd') : "-"}
                </td>
              </ListRow>
            ))}
          </React.Fragment>
        );
      })()}
    </SearchableListLayout>
  );
}
