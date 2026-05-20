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
  saveAccountingSeasonAction,
  addIncomeAction
} from "../api/accounting-server-actions";
import { showDialog } from "@/src/lib/functions";
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
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    title: "",
    amount: 0,
    date: utils.format(new Date(), "yyyy.MM.dd")
  });
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    initialData.season?.memberIds || []
  );

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
    const settlementAmount = isTarget ? totals.averageBurden - myContribution : 0;
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
          contribution: userExpenses - userIncomes
        };
      })
      .filter(Boolean) as Array<{
        uid: string;
        name: string;
        pictureUrl?: string;
        sectionId: string;
        roleId: string;
        contribution: number;
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
        <h3 className={styles.sectionHeader}>セクション: {sectionMap[sectionId] || "未設定"}</h3>
        <ul className={styles.memberList}>
          {members.map(m => (
            <li key={m.uid} className={styles.memberItem}>
              {m.pictureUrl ? (
                <img src={m.pictureUrl} alt={m.name} width={40} height={40} className={styles.memberAvatar} />
              ) : (
                <div className={styles.memberAvatar} style={{ background: "#eee", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="fa-solid fa-user" style={{ color: "#ccc" }}></i>
                </div>
              )}
              <div className={styles.memberName}>{m.name}</div>
              <div className={styles.memberInfo}>
                <div className={styles.roleLabel}>役割: {roleMap[m.roleId] || "未設定"}</div>
                <div className={styles.contribLabel}>立替・貢献額</div>
                <div className={styles.contribValue}>¥{m.contribution.toLocaleString()}</div>
              </div>
            </li>
          ))}
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

  const handleUpdateMembers = async () => {
    if (!season || !userData?.isSystemAdmin) return;
    try {
      await saveAccountingSeasonAction({
        ...season,
        memberIds: selectedMemberIds
      });
      setShowMemberSelect(false);
      showDialog("メンバーを更新しました。");
    } catch (e) {
      console.error(e);
      showDialog("更新に失敗しました。");
    }
  };

  const toggleMember = (uid: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleAddIncome = async () => {
    if (!userData) return;
    if (!incomeForm.title || incomeForm.amount <= 0) {
      showDialog("タイトルと金額を正しく入力してください。");
      return;
    }
    try {
      await addIncomeAction({
        uid: userData.id,
        userName: userData.displayName,
        title: incomeForm.title,
        amount: incomeForm.amount,
        date: incomeForm.date,
        status: "approved"
      });
      setShowIncomeModal(false);
      setIncomeForm({ title: "", amount: 0, date: utils.format(new Date(), "yyyy.MM.dd") });
      showDialog("収入を登録しました。");
    } catch (e) {
      console.error(e);
      showDialog("登録に失敗しました。");
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
              <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                <button
                  className={`${styles.button} ${styles.outlineButton}`}
                  onClick={() => setShowIncomeModal(true)}
                  style={{ flex: 1 }}
                >
                  <i className="fa-solid fa-hand-holding-dollar"></i> 収入を登録
                </button>
                <Link href="/expense-apply?mode=new" style={{ flex: 1, textDecoration: "none" }}>
                  <button className={`${styles.button} ${styles.primaryButton}`} style={{ width: "100%" }}>
                    <i className="fa-solid fa-receipt"></i> 支出を登録
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
                    onClick={() => {
                      setSelectedMemberIds(season.memberIds);
                      setShowMemberSelect(true);
                    }}
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

        {/* メンバー選択ダイアログ */}
        {showMemberSelect && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "20px"
            }}
          >
            <div className={styles.card} style={{ maxWidth: "500px", width: "100%", maxHeight: "80vh", overflow: "auto" }}>
              <h3>精算対象メンバーの選択</h3>
              <div style={{ margin: "16px 0" }}>
                {users
                  .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""))
                  .map(u => (
                    <label key={u.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(u.id)}
                        onChange={() => toggleMember(u.id)}
                      />
                      {u.pictureUrl && (
                        <img src={u.pictureUrl} alt={u.displayName!} width={24} height={24} style={{ borderRadius: "50%" }} />
                      )}
                      <span>{u.displayName}</span>
                    </label>
                  ))}
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
                <button className={`${styles.button} ${styles.outlineButton}`} onClick={() => setShowMemberSelect(false)}>
                  キャンセル
                </button>
                <button className={`${styles.button} ${styles.primaryButton}`} onClick={handleUpdateMembers}>
                  保存する
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 収入登録モーダル */}
        {showIncomeModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "20px"
            }}
          >
            <div className={styles.card} style={{ maxWidth: "400px", width: "100%" }}>
              <h3>収入の登録</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", margin: "20px 0" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#666" }}>項目名</label>
                  <input
                    type="text"
                    placeholder="例: チケット売上"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd" }}
                    value={incomeForm.title}
                    onChange={e => setIncomeForm({ ...incomeForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#666" }}>金額</label>
                  <input
                    type="number"
                    placeholder="金額を入力"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd" }}
                    value={incomeForm.amount || ""}
                    onChange={e => setIncomeForm({ ...incomeForm, amount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "#666" }}>発生日</label>
                  <input
                    type="text"
                    placeholder="yyyy.mm.dd"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd" }}
                    value={incomeForm.date}
                    onChange={e => setIncomeForm({ ...incomeForm, date: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button className={`${styles.button} ${styles.outlineButton}`} onClick={() => setShowIncomeModal(false)}>
                  キャンセル
                </button>
                <button className={`${styles.button} ${styles.primaryButton}`} onClick={handleAddIncome}>
                  登録する
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseLayout>
  );
}
