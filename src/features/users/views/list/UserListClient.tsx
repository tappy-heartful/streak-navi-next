"use client";

import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { ListGroupContainer } from "@/src/components/Layout/ListGroupContainer";
import { SimpleTable } from "@/src/components/Table/SimpleTable";
import { User, Section, Role, Instrument, SecretWord } from "@/src/lib/firestore/types";
import { globalLineDefaultImage } from "@/src/lib/functions";
import Link from "next/link";
import React, { useMemo } from "react";
import styles from "./user-list.module.css";

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

  // 補助関数群
  const getRoleName = (roleId?: string) =>
    roles.find(r => r.id === roleId)?.name ?? "-";

  const getInstrumentNames = (instIds?: string[]) => {
    if (!instIds || instIds.length === 0) return "-";
    return instIds
      .map(id => instruments.find(i => i.id === id)?.name)
      .filter(Boolean)
      .join("\n");
  };

  const getAdminRoles = (user: User) => {
    const admins = secretWords
      .filter(sw => user[sw.roleField])
      .map(sw => sw.label);
    return admins.length > 0 ? admins.join("\n") : "-";
  };

  // ユーザをセクションごとにグループ化し、roleIdでソートする
  const usersBySection = useMemo(() => {
    const grouped: Record<string, User[]> = {};
    const unknownUsers: User[] = [];

    users.forEach(user => {
      const sectionId = user.sectionId;
      if (sectionId) {
        if (!grouped[sectionId]) grouped[sectionId] = [];
        grouped[sectionId].push(user);
      } else {
        unknownUsers.push(user);
      }
    });

    // 各グループ内で roleId 昇順でソート
    const sortFn = (a: User, b: User) => {
      const roleA = a.roleId || "";
      const roleB = b.roleId || "";
      return roleA.localeCompare(roleB, undefined, { numeric: true });
    };

    Object.values(grouped).forEach(group => group.sort(sortFn));
    unknownUsers.sort(sortFn);

    return { grouped, unknownUsers };
  }, [users]);

  return (
    <ListBaseLayout
      title="ユーザ"
      icon="fa-solid fa-users"
      basePath="/user"
      count={users.length}
      hideAddButton={true}
    >
      {/* 登録されているセクション順に表示 */}
      {sections.map(section => {
        const sectionUsers = usersBySection.grouped[section.id];
        if (!sectionUsers || sectionUsers.length === 0) return null;

        return (
          <div key={section.id} className="container">
            <ListGroupContainer title={section.name}>
              <SimpleTable headers={["氏名", "略称", "楽器", "役職", "権限"]} hasData={true}>
                {sectionUsers.map(u => (
                  <tr key={u.id}>
                    <td className="list-table-row-header">
                      <Link href={`/user/confirm?uid=${u.id}`} className={styles.userLink}>
                        <img
                          src={u.pictureUrl || globalLineDefaultImage}
                          alt="icon"
                          className={styles.userThumb}
                          onError={(e) => { (e.target as HTMLImageElement).src = globalLineDefaultImage; }}
                        />
                        <span className={styles.userNameText}>{u.displayName || "名無し"}</span>
                      </Link>
                    </td>
                    <td>{u.abbreviation || "-"}</td>
                    <td className={styles.textSmall}>{getInstrumentNames(u.instrumentIds)}</td>
                    <td>{getRoleName(u.roleId)}</td>
                    <td className={styles.textSmall}>{getAdminRoles(u)}</td>
                  </tr>
                ))}
              </SimpleTable>
            </ListGroupContainer>
          </div>
        );
      })}

      {/* パート未設定ユーザー */}
      {usersBySection.unknownUsers.length > 0 && (
        <div className="container">
          <ListGroupContainer title="❓未設定" titleStyle={{ borderColor: "#ff9800" }}>
            <SimpleTable headers={["氏名", "略称", "楽器",  "役職", "権限"]} hasData={true}>
              {usersBySection.unknownUsers.map(u => (
                <tr key={u.id}>
                  <td className="list-table-row-header">
                    <Link href={`/user/confirm?uid=${u.id}`} className={styles.userLink}>
                      <img
                        src={u.pictureUrl || globalLineDefaultImage}
                        alt="icon"
                        className={styles.userThumb}
                        onError={(e) => { (e.target as HTMLImageElement).src = globalLineDefaultImage; }}
                      />
                      <span className={styles.userNameText}>{u.displayName || "名無し"}</span>
                    </Link>
                  </td>
                  <td>{u.abbreviation || "-"}</td>
                  <td className={styles.textSmall}>{getInstrumentNames(u.instrumentIds)}</td>
                  <td>{getRoleName(u.roleId)}</td>
                  <td className={styles.textSmall}>{getAdminRoles(u)}</td>
                </tr>
              ))}
            </SimpleTable>
          </ListGroupContainer>
        </div>
      )}
    </ListBaseLayout>
  );
}
