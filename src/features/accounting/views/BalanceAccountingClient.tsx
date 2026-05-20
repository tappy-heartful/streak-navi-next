"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import {
  AccountingSeason,
  AccountingConfig,
  ExpenseApply,
  Income,
  User,
  Section,
  Role,
  AccountingSeasonKey,
  AccountingStatus
} from "@/src/lib/firestore/types";
import styles from "../components/BalanceAccounting.module.css";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import * as utils from "@/src/lib/functions";
import {
  saveAccountingSeasonAction
} from "../api/accounting-server-actions";
import { showDialog } from "@/src/lib/functions";
import { showModal } from "@/src/components/CommonModal";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  initialData: {
    season: AccountingSeason | null;
    config: AccountingConfig;
    expenses: ExpenseApply[];
    incomes: Income[];
    users: User[];
    sections?: Section[];
    roles?: Role[];
    year: number;
    seasonKey: AccountingSeasonKey;
  };
}

export function BalanceAccountingClient({ initialData }: Props) {
  const { userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const router = useRouter();

  const {
    season,
    config,
    expenses,
    incomes,
    users,
    year,
    seasonKey,
    sections = [],
    roles = []
  } = initialData;

  const [isInitializing, setIsInitializing] = useState(false);

  // mapping tables
  const sectionMap = useMemo(() => {
    const map: Record<string, string> = {};
    sections.forEach(s => {
      map[s.id] = s.name;
    });
    return map;
  }, [sections]);

  const roleMap = useMemo(() => {
    const map: Record<string, string> = {};
    roles.forEach(r => {
      map[r.id] = r.name;
    });
    return map;
  }, [roles]);

  useEffect(() => {
    setBreadcrumbs([
      { title: "バランス会計" }
    ]);
  }, [setBreadcrumbs]);

  const seasonInfo = config.seasons[seasonKey];
  const seasonName = `${year}年 ${seasonInfo.name}シーズン`;
  const periodStr = `${seasonInfo.startMonth}月〜${seasonInfo.endMonth}月`;

  // 会計計算
  const totals = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncomes = incomes.reduce((sum, i) => sum + i.amount, 0);
    const netTotal = totalExpenses - totalIncomes;
    const memberCount = season?.memberIds.length || 0;
    const averageBurden = memberCount > 0 ? Math.floor(netTotal / memberCount) : 0;
    return { totalExpenses, totalIncomes, netTotal, memberCount, averageBurden };
  }, [expenses, incomes, season]);

  // 個人の計算
  const personal = useMemo(() => {
    if (!userData) return null;
    const myExpenses = expenses
      .filter(e => e.uid === userData.id)
      .reduce((s, e) => s + e.amount, 0);
    const myIncomes = incomes
      .filter(i => i.uid === userData.id)
      .reduce((s, i) => s + i.amount, 0);
    const myContribution = myExpenses - myIncomes;
    const isTarget = season?.memberIds.includes(userData.id);
    const settlementAmount = (isTarget ? totals.averageBurden : 0) - myContribution;
    return { myExpenses, myIncomes, myContribution, isTarget, settlementAmount };
  }, [userData, expenses, incomes, season, totals]);

  // メンバーをセクションでグルーピングし、roleIdで二次ソート
  const groupedMembers = useMemo(() => {
    const members = (season?.memberIds || [])
      .map(uid => {
        const user = users.find(u => u.id === uid);
        if (!user) return null;
        const userExpenses = expenses
          .filter(e => e.uid === uid)
          .reduce((s, e) => s + e.amount, 0);
        const userIncomes = incomes
          .filter(i => i.uid === uid)
          .reduce((s, i) => s + i.amount, 0);
        return {
          uid,
          name: user.displayName || "不明なユーザー",
          pictureUrl: user.pictureUrl,
          sectionId: user.sectionId ?? "unknown",
          roleId: user.roleId ?? "unknown",
          contribution: userExpenses - userIncomes,
          paypayId: user.paypayId
        };
      })
      .filter(Boolean) as Array<{
        uid: string;
        name: string;
        pictureUrl?: string;
        sectionId: string;
        roleId: string;
        contribution: number;
        paypayId?: string;
      }>;

    const grouped: Record<string, typeof members> = {};
    members.forEach(m => {
      const key = m.sectionId;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });
    // ソート: 貢献度降順、次に roleId 昇順
    Object.values(grouped).forEach(arr => {
      arr.sort((a, b) => {
        if (b.contribution !== a.contribution) return b.contribution - a.contribution;
        return a.roleId.localeCompare(b.roleId);
      });
    });
    return grouped;
  }, [season, users, expenses, incomes]);

  const renderGroupedMembers = () => (
    Object.entries(groupedMembers).map(([sectionId, members]) => (
      <div key={sectionId} className={styles.sectionBlock}>
        <h3 className={styles.sectionHeader}>{sectionMap[sectionId] || "未設定"}</h3>
        <ul className={styles.memberList}>
          {members.map(m => {
            const memberSettlement = totals.averageBurden - m.contribution;
            return (
              <li key={m.uid} className={styles.memberItem}>
                {m.pictureUrl ? (
                  <img src={m.pictureUrl} alt={m.name} width={40} height={40} className={styles.memberAvatar} />
                ) : (
                  <div className={styles.memberAvatar} style={{ background: "#eee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="fa-solid fa-user" style={{ color: "#ccc" }}></i>
                  </div>
                )}
                <div className={styles.memberName}>
                  <div>{m.name}</div>
                  {m.paypayId && (
                    <div style={{ fontSize: "0.75rem", color: "#666", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px", fontWeight: "normal" }}>
                      <i className="fa-solid fa-wallet" style={{ fontSize: "0.7rem", color: "#a0aec0" }}></i>
                      PayPay ID: {m.paypayId}
                    </div>
                  )}
                </div>
                <div className={styles.memberInfo}>
                  <div className={styles.contribLabel}>立替・貢献額</div>
                  <div className={styles.contribValue} style={{ color: "#4a5568" }}>¥{m.contribution.toLocaleString()}</div>
                  <div className={styles.contribLabel} style={{ marginTop: "4px" }}>精算額</div>
                  <div className={`${styles.contribValue} ${memberSettlement > 0 ? styles.plus : styles.minus}`}>
                    {memberSettlement > 0
                      ? `支払い ¥${memberSettlement.toLocaleString()}`
                      : `受け取り ¥${Math.abs(memberSettlement).toLocaleString()}`}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    ))
  );

  const handleInitializeSeason = async () => {
    if (!userData?.isSystemAdmin) return;
    setIsInitializing(true);
    try {
      const newSeason: AccountingSeason = {
        id: `${year}-${seasonKey}`,
        year,
        seasonKey,
        memberIds: users.map(u => u.id),
        status: "active" as AccountingStatus,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await saveAccountingSeasonAction(newSeason);
      showDialog("シーズンを初期化しました。対象メンバーを調整してください。");
    } catch (e) {
      console.error(e);
      showDialog("初期化に失敗しました。");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleOpenMemberSelectModal = async () => {
    if (!season || !userData?.isSystemAdmin) return;
    
    const currentMemberIds = season.memberIds || [];
    const html = users
      .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""))
      .map(u => {
        const isChecked = currentMemberIds.includes(u.id);
        const avatar = u.pictureUrl
          ? `<img src="${u.pictureUrl}" alt="${u.displayName}" width="24" height="24" style="border-radius: 50%;" />`
          : `<div style="width: 24px; height: 24px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; border: 1px solid #ccc; overflow: hidden;"><i class="fa-solid fa-user" style="color: #ccc; font-size: 12px;"></i></div>`;
        return `
          <label style="display: flex; align-items: center; gap: 12px; padding: 8px 0; cursor: pointer; user-select: none;">
            <input type="checkbox" id="${u.id}" ${isChecked ? "checked" : ""} style="width: 18px; height: 18px; cursor: pointer;" />
            ${avatar}
            <span style="font-size: 16px; color: #333;">${u.displayName}</span>
          </label>
        `;
      }).join("");

    const result = await showModal(
      "精算対象メンバーの選択",
      `<div style="max-height: 50vh; overflow-y: auto; padding: 4px; display: flex; flex-direction: column; gap: 4px;">${html}</div>`,
      "保存する",
      "キャンセル"
    );

    if (result && result.success) {
      const newMemberIds = Object.keys(result.data).filter(uid => result.data[uid] === true);
      try {
        await saveAccountingSeasonAction({
          ...season,
          memberIds: newMemberIds
        });
        showDialog("メンバーを更新しました。");
      } catch (e) {
        console.error(e);
        showDialog("更新に失敗しました。");
      }
    }
  };


  return (
    <BaseLayout>
      <div className={`${styles.container} ${styles[seasonKey] || ""}`}>
        <div className="page-header">
          <h1>
            <i className="fa-solid fa-scale-balanced"></i> バランス会計
          </h1>
        </div>

        {/* ヘッダーカード */}
        <div className={`${styles.card} ${styles.headerCard}`}
          >
          <div className={styles.seasonTitle}>{seasonName}</div>
          <div className={styles.periodText}>{periodStr}</div>
          <div className={styles.statGrid}>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>全体支出</div>
              <div className={styles.statValue}>¥{totals.totalExpenses.toLocaleString()}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>全体収入</div>
              <div className={styles.statValue}>¥{totals.totalIncomes.toLocaleString()}</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>メンバー数</div>
              <div className={styles.statValue}>{totals.memberCount}名</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>平均負担額</div>
              <div className={styles.statValue}>¥{totals.averageBurden.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {!season ? (
          <div className={styles.card} style={{ textAlign: "center" }}>
            <p>今シーズンの会計はまだ開始されていません。</p>
            {userData?.isSystemAdmin && (
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={handleInitializeSeason}
                disabled={isInitializing}
                style={{ margin: "20px auto" }}
              >
                <i className="fa-solid fa-plus"></i> 今シーズンを開始する
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 個人の精算見込み */}
            <div className={`${styles.card} ${styles.personalSection}`}>
              <h3>自分の精算見込み</h3>
              {!personal?.isTarget && (
                <div style={{ color: "#e53e3e", marginBottom: "16px", fontSize: "0.9rem" }}>
                  <i className="fa-solid fa-circle-exclamation"></i> あなたはこのシーズンの精算対象に含まれていません。
                </div>
              )}
              <div className={styles.calculationRow}>
                <div className={styles.calcLabel}>バンド平均負担額</div>
                <div className={styles.calcValue}>¥{totals.averageBurden.toLocaleString()}</div>
              </div>
              <div className={styles.calculationRow}>
                <div className={styles.calcLabel}>自分の支出実績</div>
                <div className={styles.calcValue}>¥{personal?.myExpenses.toLocaleString()}</div>
              </div>
              <div className={styles.calculationRow}>
                <div className={styles.calcLabel}>自分の収入実績（代表受取）</div>
                <div className={styles.calcValue}>¥{personal?.myIncomes.toLocaleString()}</div>
              </div>
              <div className={styles.resultRow}>
                <div className={styles.resultLabel}>精算額</div>
                <div
                  className={`${styles.resultValue} ${personal?.settlementAmount! > 0 ? styles.plus : styles.minus}`}
                >
                  {personal?.settlementAmount! > 0
                    ? `支払い ¥${personal?.settlementAmount.toLocaleString()}`
                    : `受け取り ¥${Math.abs(personal?.settlementAmount!).toLocaleString()}`}
                </div>
              </div>
              <div style={{ marginTop: "20px" }}>
                <Link href="/expense-apply?mode=new" style={{ textDecoration: "none" }}>
                  <button className={`${styles.button} ${styles.primaryButton}`} style={{ width: "100%" }}>
                    <i className="fa-solid fa-receipt"></i> 収入/支出を登録する
                  </button>
                </Link>
              </div>
              <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "12px" }}>
                ※承認済みの経費のみ計上されています。
              </p>
            </div>

            {/* メンバー一覧 */}
            <div className={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3>精算対象メンバー</h3>
                {userData?.isSystemAdmin && (
                  <button
                    className={`${styles.button} ${styles.outlineButton}`}
                    onClick={handleOpenMemberSelectModal}
                    style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                  >
                    <i className="fa-solid fa-user-gear"></i> 管理
                  </button>
                )}
              </div>
              {renderGroupedMembers()}
            </div>
          </>
        )}
      </div>
    </BaseLayout>
  );
}
