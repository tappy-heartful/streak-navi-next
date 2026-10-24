"use client";

import React from "react";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { SimpleTable } from "@/src/components/Table/SimpleTable";
import { AccountingConfig } from "@/src/lib/firestore/types";
import { AccountingSeasonWithStatus } from "../../api/accounting-service";
import Link from "next/link";
import styles from "./AccountingList.module.css";

interface Props {
  initialData: {
    seasons: AccountingSeasonWithStatus[];
    config: AccountingConfig;
  };
}

export function AccountingListClient({ initialData }: Props) {
  const { seasons, config } = initialData;

  const activeSeasons = seasons.filter((s) => s.status === "active");
  const waitingSeasons = seasons.filter((s) => s.status === "waiting");
  const completedSeasons = seasons.filter((s) => s.status === "completed");

  const getSeasonName = (season: AccountingSeasonWithStatus) => {
    const info = config.seasons[season.seasonKey];
    return `${season.year}年 ${info?.name || season.seasonKey}シーズン`;
  };

  const getPeriodStr = (season: AccountingSeasonWithStatus) => {
    const info = config.seasons[season.seasonKey];
    if (!info) return "-";
    const settlementMonth = info.endMonth === 12 ? 1 : info.endMonth + 1;
    return `${info.startMonth}月〜${info.endMonth}月（精算: ${settlementMonth}月）`;
  };

  const renderSeasonTable = (seasonList: AccountingSeasonWithStatus[], emptyMessage: string) => {
    if (seasonList.length === 0) {
      return <p className={styles.emptyText}>{emptyMessage}</p>;
    }
    return (
      <div className={styles.tableWrapper}>
        <SimpleTable headers={["シーズン", "期間", "操作"]} hasData={true}>
          {seasonList.map((s) => (
            <tr key={s.id}>
              <td className="list-table-row-header">
                <Link prefetch={false} href={`/accounting/confirm?seasonId=${s.id}`}>
                  {getSeasonName(s)}
                </Link>
              </td>
              <td>{getPeriodStr(s)}</td>
              <td>
                <Link prefetch={false} href={`/accounting/confirm?seasonId=${s.id}`} className="list-link-button">
                  表示
                </Link>
              </td>
            </tr>
          ))}
        </SimpleTable>
      </div>
    );
  };

  return (
    <ListBaseLayout
      title="バランス会計"
      icon="fa-solid fa-scale-balanced"
      basePath="/accounting"
      count={seasons.length}
      hideAddButton={true}
    >
      {/* 1. 実施中のシーズン */}
      <div className="container" style={{ marginBottom: "20px" }}>
        <h3 className={`${styles.sectionTitle} ${styles.activeTitle}`}>
          <i className="fa-solid fa-play"></i> 実施中のシーズン
        </h3>
        {renderSeasonTable(activeSeasons, "実施中のシーズンはありません")}
      </div>

      {/* 2. 清算中のシーズン */}
      <div className="container" style={{ marginBottom: "20px" }}>
        <h3 className={`${styles.sectionTitle} ${styles.waitingTitle}`}>
          <i className="fa-solid fa-hourglass-half"></i> 清算中のシーズン
        </h3>
        {renderSeasonTable(waitingSeasons, "清算中のシーズンはありません")}
      </div>

      {/* 3. 終了したシーズン */}
      <div className="container" style={{ marginBottom: "20px" }}>
        <h3 className={`${styles.sectionTitle} ${styles.completedTitle}`}>
          <i className="fa-solid fa-circle-check"></i> 終了したシーズン
        </h3>
        {renderSeasonTable(completedSeasons, "終了したシーズンはありません")}
      </div>
    </ListBaseLayout>
  );
}
