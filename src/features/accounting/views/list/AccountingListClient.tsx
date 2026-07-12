"use client";

import React from "react";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { SimpleTable } from "@/src/components/Table/SimpleTable";
import { AccountingSeason, AccountingConfig } from "@/src/lib/firestore/types";
import Link from "next/link";
import styles from "./AccountingList.module.css";

interface Props {
  initialData: {
    seasons: AccountingSeason[];
    config: AccountingConfig;
  };
}

export function AccountingListClient({ initialData }: Props) {
  const { seasons, config } = initialData;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const isPastSeason = (s: AccountingSeason) => {
    const info = config.seasons[s.seasonKey];
    if (!info) return false;
    const endMonth = info.endMonth;
    const endYear = s.year;

    if (currentYear > endYear) return true;
    if (currentYear === endYear && currentMonth > endMonth) return true;
    return false;
  };

  const activeSeasons = seasons.filter((s) => !isPastSeason(s));
  const pastSeasons = seasons.filter((s) => isPastSeason(s));

  const getSeasonName = (season: AccountingSeason) => {
    const info = config.seasons[season.seasonKey];
    return `${season.year}年 ${info?.name || season.seasonKey}シーズン`;
  };

  const getPeriodStr = (season: AccountingSeason) => {
    const info = config.seasons[season.seasonKey];
    if (!info) return "-";
    const settlementMonth = info.endMonth === 12 ? 1 : info.endMonth + 1;
    return `${info.startMonth}月〜${info.endMonth}月（精算: ${settlementMonth}月）`;
  };

  return (
    <ListBaseLayout
      title="バランス会計"
      icon="fa-solid fa-scale-balanced"
      basePath="/accounting"
      count={seasons.length}
      hideAddButton={true}
    >
      <div className="container" style={{ marginBottom: "20px" }}>
        <h3 className={`${styles.sectionTitle} ${styles.activeTitle}`}>
          <i className="fa-solid fa-play"></i> 実施中のシーズン
        </h3>
        {activeSeasons.length > 0 ? (
          <div className={styles.tableWrapper}>
            <SimpleTable headers={["シーズン", "期間", "操作"]} hasData={true}>
              {activeSeasons.map((s) => (
                <tr key={s.id}>
                  <td className="list-table-row-header">
                    <Link href={`/accounting/confirm?seasonId=${s.id}`}>
                      {getSeasonName(s)}
                    </Link>
                  </td>
                  <td>{getPeriodStr(s)}</td>
                  <td>
                    <Link href={`/accounting/confirm?seasonId=${s.id}`} className="list-link-button">
                      表示
                    </Link>
                  </td>
                </tr>
              ))}
            </SimpleTable>
          </div>
        ) : (
          <p className={styles.emptyText}>実施中のシーズンはありません</p>
        )}
      </div>

      <div className="container" style={{ marginBottom: "20px" }}>
        <h3 className={`${styles.sectionTitle} ${styles.pastTitle}`}>
          <i className="fa-solid fa-archive"></i> 過去のシーズン
        </h3>
        {pastSeasons.length > 0 ? (
          <div className={styles.tableWrapper}>
            <SimpleTable headers={["シーズン", "期間", "操作"]} hasData={true}>
              {pastSeasons.map((s) => (
                <tr key={s.id}>
                  <td className="list-table-row-header">
                    <Link href={`/accounting/confirm?seasonId=${s.id}`}>
                      {getSeasonName(s)}
                    </Link>
                  </td>
                  <td>{getPeriodStr(s)}</td>
                  <td>
                    <Link href={`/accounting/confirm?seasonId=${s.id}`} className="list-link-button">
                      表示
                    </Link>
                  </td>
                </tr>
              ))}
            </SimpleTable>
          </div>
        ) : (
          <p className={styles.emptyText}>過去のシーズンはありません</p>
        )}
      </div>
    </ListBaseLayout>
  );
}
