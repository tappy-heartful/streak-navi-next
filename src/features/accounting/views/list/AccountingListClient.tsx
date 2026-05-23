"use client";

import React from "react";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { SimpleTable } from "@/src/components/Table/SimpleTable";
import { AccountingSeason, AccountingConfig } from "@/src/lib/firestore/types";
import Link from "next/link";

interface Props {
  initialData: {
    seasons: AccountingSeason[];
    config: AccountingConfig;
  };
}

export function AccountingListClient({ initialData }: Props) {
  const { seasons, config } = initialData;

  const getSeasonName = (season: AccountingSeason) => {
    const info = config.seasons[season.seasonKey];
    return `${season.year}年 ${info?.name || season.seasonKey}シーズン`;
  };

  const getPeriodStr = (season: AccountingSeason) => {
    const info = config.seasons[season.seasonKey];
    return info ? `${info.startMonth}月〜${info.endMonth}月` : "-";
  };

  return (
    <ListBaseLayout
      title="バランス会計"
      icon="fa-solid fa-scale-balanced"
      basePath="/accounting"
      count={seasons.length}
      hideAddButton={true}
    >
      <div className="container">
        <SimpleTable headers={["シーズン", "期間", "操作"]} hasData={seasons.length > 0}>
          {seasons.map((s) => (
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
    </ListBaseLayout>
  );
}
