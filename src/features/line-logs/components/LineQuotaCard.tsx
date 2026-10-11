"use client";

import React, { useState } from "react";
import { MonthQuotaSummary, AccountQuotaInfo } from "../api/line-log-client-service";
import styles from "./LineQuotaCard.module.css";

interface LineQuotaCardProps {
  quotaSummary: MonthQuotaSummary;
  displayMonthLabel: string;
  canEdit?: boolean;
  onSaveGroupMemberCount?: (count: number) => Promise<void>;
}

export default function LineQuotaCard({
  quotaSummary,
  displayMonthLabel,
  canEdit = false,
  onSaveGroupMemberCount,
}: LineQuotaCardProps) {
  const { group, individual, groupMemberCount } = quotaSummary;

  const [isEditingMemberCount, setIsEditingMemberCount] = useState<boolean>(false);
  const [editCountInput, setEditCountInput] = useState<string>(String(groupMemberCount || 1));
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSaveCount = async () => {
    const num = parseInt(editCountInput, 10);
    if (isNaN(num) || num < 1) {
      alert("人数は1人以上で入力してください。");
      return;
    }
    if (!onSaveGroupMemberCount) return;

    setIsSaving(true);
    try {
      await onSaveGroupMemberCount(num);
      setIsEditingMemberCount(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const renderCard = (info: AccountQuotaInfo, isGroup: boolean) => {
    const isSafe = info.statusLevel === "safe";
    const isWarning = info.statusLevel === "warning";

    const statusPillClass = isSafe
      ? styles.statusSafe
      : isWarning
      ? styles.statusWarning
      : styles.statusDanger;

    const numberColorClass = isSafe
      ? styles.numberSafe
      : isWarning
      ? styles.numberWarning
      : styles.numberDanger;

    const fillClass = isSafe
      ? styles.fillSafe
      : isWarning
      ? styles.fillWarning
      : styles.fillDanger;

    const statusText = isSafe
      ? "余裕あり🍀"
      : isWarning
      ? "順調に配信中💡"
      : "残数注意✨";

    return (
      <div className={styles.quotaCard} key={info.accountType}>
        <div className={styles.cardHeader}>
          <div className={styles.accountInfo}>
            <div
              className={`${styles.accountIcon} ${
                isGroup ? styles.groupIcon : styles.individualIcon
              }`}
            >
              <i className={isGroup ? "fa-solid fa-users" : "fa-solid fa-user-check"}></i>
            </div>
            <div>
              <h3 className={styles.accountName}>{info.accountName}</h3>
              <p className={styles.accountDesc}>
                {isGroup ? "バンド全体LINEグループへの一斉通知" : "未払い・受取スクショ・TODOなどの個別催促"}
              </p>
            </div>
          </div>
          <span className={`${styles.statusPill} ${statusPillClass}`}>
            {statusText}
          </span>
        </div>

        {/* グループ通知の場合は参加人数の設定・表示エリア */}
        {isGroup && (
          <div className={styles.groupMemberSection}>
            <div className={styles.groupMemberRow}>
              <span className={styles.groupMemberLabel}>
                <i className="fa-solid fa-users-viewfinder"></i> グループ参加人数:
              </span>
              {isEditingMemberCount ? (
                <div className={styles.groupMemberEditForm}>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={editCountInput}
                    onChange={(e) => setEditCountInput(e.target.value)}
                    className={styles.groupMemberInput}
                    autoFocus
                  />
                  <span className={styles.groupMemberUnit}>名</span>
                  <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={handleSaveCount}
                    disabled={isSaving}
                  >
                    {isSaving ? "保存中..." : "保存"}
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => {
                      setIsEditingMemberCount(false);
                      setEditCountInput(String(groupMemberCount || 1));
                    }}
                    disabled={isSaving}
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className={styles.groupMemberDisplay}>
                  <strong className={styles.groupMemberCount}>{groupMemberCount || 1}</strong>
                  <span className={styles.groupMemberUnit}>名</span>
                  {canEdit && (
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => {
                        setEditCountInput(String(groupMemberCount || 1));
                        setIsEditingMemberCount(true);
                      }}
                      title="グループ参加人数を変更"
                    >
                      <i className="fa-solid fa-pen-to-square"></i> 人数を変更
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className={styles.groupMemberNote}>
              ※グループ通知は「人数 ({groupMemberCount || 1}名) × メッセージ数」で消費されます
            </p>
          </div>
        )}

        <div className={styles.remainingSection}>
          <span className={styles.remainingLabel}>今月の送信数 (消費枠)</span>
          <div className={styles.remainingValue}>
            <span className={`${styles.remainingNumber} ${numberColorClass}`}>
              {info.consumed}
            </span>
            <span className={styles.remainingUnit}>/ {info.limit} 通</span>
          </div>
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressBarBg}>
            <div
              className={`${styles.progressBarFill} ${fillClass}`}
              style={{ width: `${info.usageRate}%` }}
            ></div>
          </div>
          <div className={styles.progressTextRow}>
            <span>
              残り: <strong>{info.remaining}</strong> 通 ({info.usageRate}% 使用)
            </span>
            <span>上限: {info.limit} 通/月</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <div className={styles.sectionTitle}>
          <i className="fa-solid fa-chart-pie"></i>
          <span>LINE公式アカウント配信枠の状況</span>
        </div>
        <span className={styles.monthBadge}>{displayMonthLabel}の状況</span>
      </div>

      <div className={styles.cardGrid}>
        {renderCard(group, true)}
        {renderCard(individual, false)}
      </div>

      <div className={styles.infoNote}>
        <p>
          <i className="fa-solid fa-circle-info" style={{ marginRight: "6px", color: "#06c755" }}></i>
          LINE公式アカウントの無料メッセージ枠は1アカウントあたり<strong>月200通</strong>です。
          全体グループ宛ては参加人数 × メッセージ数、個別宛ては1通につき1通として消費されます（毎月1日にリセット）。
        </p>
      </div>
    </div>
  );
}

