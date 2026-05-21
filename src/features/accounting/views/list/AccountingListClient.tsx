"use client";

import React from "react";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { SimpleTable } from "@/src/components/Table/SimpleTable";
import { AccountingSeason, AccountingConfig } from "@/src/lib/firestore/types";
import { initializeCurrentSeasonAction } from "../../api/accounting-server-actions";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";
import Link from "next/link";

interface Props {
  initialData: {
    seasons: AccountingSeason[];
    config: AccountingConfig;
    canInitialize: boolean;
  };
}

export function AccountingListClient({ initialData }: Props) {
  const { seasons, config, canInitialize } = initialData;
  const router = useRouter();
  const { userData } = useAuth();
  const isAdmin = userData?.isAccountAdmin || userData?.isSystemAdmin;

  const handleInitialize = async () => {
    showSpinner();
    try {
      const seasonId = await initializeCurrentSeasonAction();
      router.push(`/accounting/confirm?seasonId=${seasonId}`);
    } catch (e) {
      console.error(e);
      showDialog("初期化に失敗しました。", true);
    } finally {
      hideSpinner();
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "進行中";
      case "locked": return "ロック済";
      case "settled": return "精算済";
      default: return status;
    }
  };

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
        <SimpleTable headers={["シーズン", "期間", "状態", "操作"]} hasData={seasons.length > 0}>
          {seasons.map((s) => (
            <tr key={s.id}>
              <td className="list-table-row-header">
                <Link href={`/accounting/confirm?seasonId=${s.id}`}>
                  {getSeasonName(s)}
                </Link>
              </td>
              <td>{getPeriodStr(s)}</td>
              <td>{getStatusLabel(s.status)}</td>
              <td>
                <Link href={`/accounting/confirm?seasonId=${s.id}`} className="list-link-button">
                  表示
                </Link>
              </td>
            </tr>
          ))}
        </SimpleTable>
      </div>

      {isAdmin && canInitialize && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <button
            onClick={handleInitialize}
            className="list-add-button"
            style={{
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: 'fit-content',
              padding: '12px 24px'
            }}
          >
            ＋ 今シーズンを開始する
          </button>
        </div>
      )}
    </ListBaseLayout>
  );
}
