"use client";

import React from "react";
import { MonthQuotaSummary, AccountQuotaInfo } from "../api/line-log-client-service";
import styles from "./LineQuotaCard.module.css";

interface LineQuotaCardProps {
  quotaSummary: MonthQuotaSummary;
  displayMonthLabel: string;
}

export default function LineQuotaCard({ quotaSummary, displayMonthLabel }: LineQuotaCardProps) {
  const { group, individual } = quotaSummary;

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

        <div className={styles.remainingSection}>
          <span className={styles.remainingLabel}>今月の送信数</span>
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
          テキスト1回につき1カウント消費されます（毎月1日にリセット）。
        </p>
      </div>
    </div>
  );
}
