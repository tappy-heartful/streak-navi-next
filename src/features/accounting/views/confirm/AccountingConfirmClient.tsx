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
  AccountingSeasonKey
} from "@/src/lib/firestore/types";
import styles from "../../components/BalanceAccounting.module.css";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import * as utils from "@/src/lib/functions";
import {
  saveAccountingSeasonAction
} from "../../api/accounting-server-actions";
import { showDialog } from "@/src/lib/functions";
import { showModal } from "@/src/components/CommonModal";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { storage } from "@/src/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { compressImage } from "@/src/lib/image-compression";
import { PersonalSettlementCard } from "../../components/PersonalSettlementCard";

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

export function AccountingConfirmClient({ initialData }: Props) {
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
    const seasonInfo = config.seasons[seasonKey];
    const seasonName = `${year}年 ${seasonInfo?.name || seasonKey}シーズン`;
    setBreadcrumbs([
      { title: "バランス会計一覧", href: "/accounting" },
      { title: seasonName }
    ]);
  }, [setBreadcrumbs, config, year, seasonKey]);

  const seasonInfo = config.seasons[seasonKey];
  const seasonName = `${year}年 ${seasonInfo.name}シーズン`;
  const periodStr = `${seasonInfo.startMonth}月〜${seasonInfo.endMonth}月`;

  const manager = useMemo(() => {
    if (!season?.managerId) return null;
    return users.find(u => u.id === season.managerId);
  }, [season?.managerId, users]);

  // 会計計算
  const totals = useMemo(() => {
    const activeMemberIds = season?.memberIds || [];
    const totalExpenses = expenses
      .filter(e => activeMemberIds.includes(e.uid))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalIncomes = incomes
      .filter(i => activeMemberIds.includes(i.uid))
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const netTotal = totalExpenses - totalIncomes;
    const memberCount = activeMemberIds.length;
    const averageBurden = memberCount > 0 ? Math.floor(netTotal / memberCount) : 0;
    return { totalExpenses, totalIncomes, netTotal, memberCount, averageBurden };
  }, [expenses, incomes, season]);

  // 個人の計算
  const personal = useMemo(() => {
    if (!userData) return null;
    const myExpenses = expenses
      .filter(e => e.uid === userData.id)
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const myIncomes = incomes
      .filter(i => i.uid === userData.id)
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const myContribution = myExpenses - myIncomes;
    const isTarget = !!season?.memberIds.includes(userData.id);
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
          .reduce((s, e) => s + Number(e.amount || 0), 0);
        const userIncomes = incomes
          .filter(i => i.uid === uid)
          .reduce((s, i) => s + Number(i.amount || 0), 0);
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

  const isAccountAdmin = userData?.isAccountAdmin || userData?.isSystemAdmin;
  const isSaxPart = userData?.sectionId === "1";
  const canSetManager = isSaxPart || isAccountAdmin;

  const handleSetManager = async () => {
    if (!season || !canSetManager) return;

    // サックスパート（sectionId="1"）のユーザーを抽出
    const saxUsers = users.filter(u => u.sectionId === "1");

    if (saxUsers.length === 0) {
      showDialog("サックスパートのユーザーが見つかりません。", true);
      return;
    }

    let html = `
      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 50vh; overflow-y: auto; padding: 4px;">
        <label style="display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
          <input type="radio" id="managerId" name="managerId" value="" ${!season.managerId ? "checked" : ""} style="width: 18px; height: 18px;" />
          <span style="font-size: 15px; color: #4a5568;">担当者なし</span>
        </label>
    `;

    saxUsers.forEach(u => {
      const isSelected = season.managerId === u.id;
      const avatar = u.pictureUrl
        ? `<img src="${u.pictureUrl}" alt="${u.displayName}" width="24" height="24" style="border-radius: 50%;" />`
        : `<div style="width: 24px; height: 24px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; border: 1px solid #ccc;"><i class="fa-solid fa-user" style="color: #ccc; font-size: 12px;"></i></div>`;

      html += `
        <label style="display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
          <input type="radio" id="managerId" name="managerId" value="${u.id}" ${isSelected ? "checked" : ""} style="width: 18px; height: 18px;" />
          ${avatar}
          <span style="font-size: 15px; color: #2d3748;">${u.displayName}</span>
        </label>
      `;
    });

    html += `</div>`;

    const result = await showModal(
      "シーズン担当者の設定",
      html,
      "設定する",
      "キャンセル"
    );

    if (result && result.success) {
      const newManagerId = result.data.managerId;
      try {
        await saveAccountingSeasonAction({
          id: season.id,
          managerId: newManagerId
        });
        showDialog("シーズン担当者を更新しました。", true);
        router.refresh();
      } catch (e) {
        console.error(e);
        showDialog("更新に失敗しました。", true);
      }
    }
  };

  const handleShowExpensesModal = async (uid: string, name: string) => {
    const userExpenses = expenses.filter(e => e.uid === uid);
    const userIncomes = incomes.filter(i => i.uid === uid);

    if (userExpenses.length === 0 && userIncomes.length === 0) {
      showDialog(`${name} さんの承認済み経費・登録収入はありません。`, true);
      return;
    }

    let html = `<div style="font-family: sans-serif; max-height: 60vh; overflow-y: auto; padding: 4px;">`;

    if (userExpenses.length > 0) {
      html += `
        <h4 style="margin: 0 0 10px 0; border-bottom: 2px solid #3182ce; padding-bottom: 6px; color: #2b6cb0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-receipt"></i> 支出実績 (${userExpenses.length}件)
        </h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem;">
          <thead>
            <tr style="background: #ebf8ff; border-bottom: 2px solid #bee3f8; text-align: left;">
              <th style="padding: 8px;">日付</th>
              <th style="padding: 8px;">品目・経費名</th>
              <th style="padding: 8px; text-align: right;">金額</th>
            </tr>
          </thead>
          <tbody>
      `;
      userExpenses.forEach(e => {
        html += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; color: #4a5568;">${e.date || "-"}</td>
            <td style="padding: 8px; color: #2d3748; font-weight: 500;">${e.name || e.category || "-"}</td>
            <td style="padding: 8px; text-align: right; color: #e53e3e; font-weight: 600;">¥${Number(e.amount || 0).toLocaleString()}</td>
          </tr>
        `;
      });
      html += `</tbody></table>`;
    }

    if (userIncomes.length > 0) {
      html += `
        <h4 style="margin: 0 0 10px 0; border-bottom: 2px solid #319795; padding-bottom: 6px; color: #2c7a7b; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-hand-holding-dollar"></i> 収入実績（代表受取） (${userIncomes.length}件)
        </h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
          <thead>
            <tr style="background: #e6fffa; border-bottom: 2px solid #b2f5ea; text-align: left;">
              <th style="padding: 8px;">日付</th>
              <th style="padding: 8px;">項目・収入名</th>
              <th style="padding: 8px; text-align: right;">金額</th>
            </tr>
          </thead>
          <tbody>
      `;
      userIncomes.forEach(i => {
        html += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; color: #4a5568;">${i.date || "-"}</td>
            <td style="padding: 8px; color: #2d3748; font-weight: 500;">${i.title || "-"}</td>
            <td style="padding: 8px; text-align: right; color: #319795; font-weight: 600;">¥${Number(i.amount || 0).toLocaleString()}</td>
          </tr>
        `;
      });
      html += `</tbody></table>`;
    }

    html += `</div>`;

    await showModal(`${name} さんの経費申請内訳`, html);
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>, uid: string, name: string) => {
    const file = e.target.files?.[0];
    if (!file || !season) return;

    utils.showSpinner();
    try {
      // Delete old file from Storage if it exists
      const oldUrl = season.evidenceUrls?.[uid];
      if (oldUrl) {
        const oldFileRef = ref(storage, oldUrl);
        await deleteObject(oldFileRef).catch(err => {
          console.warn("Old storage file delete failed:", err);
        });
      }

      const compressed = await compressImage(file);
      const timestamp = Date.now();
      const storagePath = `accounting/evidence/${season.id}/${uid}_${timestamp}.png`;
      const storageRef = ref(storage, storagePath);

      const snapshot = await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(snapshot.ref);

      const updatedUrls = { ...(season.evidenceUrls || {}) };
      updatedUrls[uid] = url;

      await saveAccountingSeasonAction({
        ...season,
        evidenceUrls: updatedUrls
      });

      await utils.showDialog(`${name} さんのエビデンス画像を登録しました。`, true);
      router.refresh();
    } catch (err) {
      console.error(err);
      await utils.showDialog("エビデンス画像のアップロードに失敗しました。", true);
    } finally {
      utils.hideSpinner();
      e.target.value = "";
    }
  };

  const handleDeleteEvidence = async (uid: string, name: string) => {
    if (!season) return;
    const evidenceUrl = season.evidenceUrls?.[uid];
    if (!evidenceUrl) return;

    const confirm = await utils.showDialog(`${name} さんのエビデンス画像を削除しますか？`);
    if (!confirm) return;

    utils.showSpinner();
    try {
      const fileRef = ref(storage, evidenceUrl);
      await deleteObject(fileRef).catch(err => {
        console.warn("Storage delete failed or file not found:", err);
      });

      const updatedUrls = { ...(season.evidenceUrls || {}) };
      delete updatedUrls[uid];

      await saveAccountingSeasonAction({
        ...season,
        evidenceUrls: updatedUrls
      });

      await utils.showDialog("エビデンス画像を削除しました。", true);
      router.refresh();
    } catch (err) {
      console.error(err);
      await utils.showDialog("エビデンス画像の削除に失敗しました。", true);
    } finally {
      utils.hideSpinner();
    }
  };

  const handleViewEvidence = async (name: string, url: string) => {
    await showModal(
      `${name} さんの精算エビデンス`,
      `<div style="text-align: center; padding: 10px;">
        <img src="${url}" alt="evidence" style="max-width: 100%; max-height: 70vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
      </div>`
    );
  };

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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{m.name}</span>
                    {m.uid !== season?.managerId && season?.evidenceUrls?.[m.uid] && (
                      <span className={styles.statusBadgeUploaded}>済</span>
                    )}
                  </div>
                </div>
                <div className={styles.memberInfo}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <div className={styles.contribLabel}>立替・貢献額</div>
                    <div
                      className={styles.contribValue}
                      onClick={() => handleShowExpensesModal(m.uid, m.name)}
                      style={{ color: "#3182ce", fontWeight: "bold", textDecoration: "underline", cursor: "pointer" }}
                      title="クリックして内訳を表示"
                    >
                      ¥{m.contribution.toLocaleString()}
                    </div>
                  </div>
                  <div className={styles.contribLabel} style={{ marginTop: "4px" }}>精算額</div>
                  <div className={`${styles.contribValue} ${memberSettlement > 0 ? styles.plus : styles.minus}`}>
                    {memberSettlement > 0
                      ? `支払 ¥${memberSettlement.toLocaleString()}`
                      : `受取 ¥${Math.abs(memberSettlement).toLocaleString()}`}
                  </div>

                  {/* エビデンス表示・アップロード部分 */}
                  <div className={styles.evidenceContainer}>
                    {m.uid !== season?.managerId && (
                      <>
                        {season?.evidenceUrls?.[m.uid] && (
                          <button
                            type="button"
                            className={styles.btnReceiptView}
                            onClick={() => handleViewEvidence(m.name, season.evidenceUrls![m.uid])}
                            title="エビデンス画像を表示"
                          >
                            表示
                          </button>
                        )}
                        {isAccountAdmin && season?.evidenceUrls?.[m.uid] && (
                          <button
                            type="button"
                            className={styles.btnReceiptDelete}
                            onClick={() => handleDeleteEvidence(m.uid, m.name)}
                            title="エビデンス画像を削除"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )}
                        {isAccountAdmin && (
                          <label className={styles.btnReceiptUpload} title="エビデンス画像をアップロード">
                            <i className="fa-solid fa-upload"></i>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => handleUploadEvidence(e, m.uid, m.name)}
                            />
                          </label>
                        )}
                        {!isAccountAdmin && !season?.evidenceUrls?.[m.uid] && (
                          <span className={styles.evidencePlaceholder}>エビデンス未登録</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    ))
  );

  const handleOpenMemberSelectModal = async () => {
    if (!season || !userData?.isSystemAdmin) return;

    const currentMemberIds = season.memberIds || [];

    // グループ化
    const grouped: Record<string, User[]> = {};
    users.forEach(u => {
      const sectionId = u.sectionId || "unknown";
      if (!grouped[sectionId]) grouped[sectionId] = [];
      grouped[sectionId].push(u);
    });

    // セクション順に並び替え
    const sortedSectionIds = sections.map(s => s.id);
    Object.keys(grouped).forEach(sid => {
      if (!sortedSectionIds.includes(sid)) {
        sortedSectionIds.push(sid);
      }
    });

    let html = "";
    sortedSectionIds.forEach(sectionId => {
      const memberList = grouped[sectionId];
      if (!memberList || memberList.length === 0) return;

      // セクション内ソート（roleId昇順、displayName昇順）
      memberList.sort((a, b) => {
        const roleA = a.roleId || "";
        const roleB = b.roleId || "";
        if (roleA !== roleB) return roleA.localeCompare(roleB);
        return (a.displayName || "").localeCompare(b.displayName || "");
      });

      const sectionName = sectionMap[sectionId] || "未設定";

      html += `
        <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <h4 style="margin: 0 0 10px 0; color: #2b6cb0; font-size: 1rem; font-weight: bold; border-left: 4px solid #3182ce; padding-left: 8px; text-align: left;">
            ${sectionName}
          </h4>
          <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 8px;">
      `;

      memberList.forEach(u => {
        const isChecked = currentMemberIds.includes(u.id);
        const avatar = u.pictureUrl
          ? `<img src="${u.pictureUrl}" alt="${u.displayName}" width="24" height="24" style="border-radius: 50%;" />`
          : `<div style="width: 24px; height: 24px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; border: 1px solid #ccc; overflow: hidden;"><i class="fa-solid fa-user" style="color: #ccc; font-size: 12px;"></i></div>`;

        html += `
          <label style="display: flex; align-items: center; gap: 12px; padding: 6px 0; cursor: pointer; user-select: none;">
            <input type="checkbox" id="${u.id}" ${isChecked ? "checked" : ""} style="width: 18px; height: 18px; cursor: pointer;" />
            ${avatar}
            <span style="font-size: 15px; color: #2d3748;">${u.displayName}</span>
          </label>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    const result = await showModal(
      "精算対象メンバーの選択",
      `<div style="max-height: 60vh; overflow-y: auto; padding: 8px;">${html}</div>`,
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
        showDialog("メンバーを更新しました。", true);
      } catch (e) {
        console.error(e);
        showDialog("更新に失敗しました。", true);
      }
    }
  };


  return (
    <BaseLayout>
      <div className={`${styles.container} ${styles[seasonKey] || ""}`}>
        <div className="page-header">
          <h1>
            <i className="fa-solid fa-scale-balanced"></i> バランス会計確認
          </h1>
        </div>

        {/* ヘッダーカード */}
        <div className={`${styles.card} ${styles.headerCard}`}>
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

        {/* 個人の精算見込み */}
        {personal && (
          <PersonalSettlementCard
            season={season!}
            seasonName={seasonName}
            periodStr={periodStr}
            averageBurden={totals.averageBurden}
            myExpenses={personal.myExpenses}
            myIncomes={personal.myIncomes}
            settlementAmount={personal.settlementAmount}
            isTarget={personal.isTarget}
            seasonKey={seasonKey}
          />
        )}

        {/* メンバー一覧 */}
        <div className={styles.card}>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ marginBottom: "12px" }}>精算対象メンバー</h3>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {/* シーズン担当 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#4a5568', background: '#f7fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <i className="fa-solid fa-user-tie" style={{ color: '#718096' }}></i>
                <span style={{ fontWeight: '500' }}>担当: {manager?.displayName || "未設定"}</span>
                {canSetManager && (
                  <button
                    onClick={handleSetManager}
                    style={{ border: 'none', background: 'none', color: '#3182ce', cursor: 'pointer', padding: '0 2px', fontSize: '0.75rem', textDecoration: 'underline', marginLeft: '4px' }}
                  >
                    変更
                  </button>
                )}
              </div>

              {/* 管理ボタン */}
              {userData?.isSystemAdmin && (
                <button
                  className={`${styles.button} ${styles.outlineButton}`}
                  onClick={handleOpenMemberSelectModal}
                  style={{ padding: "6px 12px", fontSize: "0.8rem", whiteSpace: 'nowrap' }}
                >
                  <i className="fa-solid fa-user-gear"></i> 精算メンバー管理
                </button>
              )}
            </div>
          </div>
          {renderGroupedMembers()}
        </div>
      </div>

      <div className="page-footer">
        <Link href="/accounting" className="back-link">← 一覧に戻る</Link>
      </div>
    </BaseLayout>
  );
}
