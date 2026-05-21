import React from "react";
import Link from "next/link";
import styles from "./BalanceAccounting.module.css";
import { AccountingSeason, AccountingSeasonKey } from "@/src/lib/firestore/types";

interface PersonalSettlementCardProps {
  season: AccountingSeason | null;
  seasonName: string;
  periodStr: string;
  averageBurden: number;
  myExpenses: number;
  myIncomes: number;
  settlementAmount: number;
  isTarget: boolean;
  seasonKey: AccountingSeasonKey | "default";
}

export const PersonalSettlementCard: React.FC<PersonalSettlementCardProps> = ({
  season,
  seasonName,
  periodStr,
  averageBurden,
  myExpenses,
  myIncomes,
  settlementAmount,
  isTarget,
  seasonKey,
}) => {
  if (!season) return null;

  return (
    <div className={`${styles.personalCardWrapper} ${styles[seasonKey] || ""}`}>
      <div className={`${styles.card} ${styles.personalSection}`}>
        <div className={styles.cardHeaderInfo}>
          <div className={styles.cardSeasonTitle}>{seasonName}</div>
          <div className={styles.cardPeriodText}>{periodStr}</div>
        </div>
        
        <h3>自分の精算見込み</h3>
        {!isTarget && (
          <div style={{ color: "#e53e3e", marginBottom: "16px", fontSize: "0.9rem" }}>
            <i className="fa-solid fa-circle-exclamation"></i> あなたはこのシーズンの精算対象に含まれていません。
          </div>
        )}
        <div className={styles.calculationRow}>
          <div className={styles.calcLabel}>バンド平均負担額</div>
          <div className={styles.calcValue}>¥{averageBurden.toLocaleString()}</div>
        </div>
        <div className={styles.calculationRow}>
          <div className={styles.calcLabel}>自分の支出実績</div>
          <div className={styles.calcValue}>¥{myExpenses.toLocaleString()}</div>
        </div>
        <div className={styles.calculationRow}>
          <div className={styles.calcLabel}>自分の収入実績（代表受取）</div>
          <div className={styles.calcValue}>¥{myIncomes.toLocaleString()}</div>
        </div>
        <div className={styles.resultRow}>
          <div className={styles.resultLabel}>精算額</div>
          <div
            className={`${styles.resultValue} ${settlementAmount > 0 ? styles.plus : styles.minus}`}
          >
            {settlementAmount > 0
              ? `支払 ¥${settlementAmount.toLocaleString()}`
              : `受取 ¥${Math.abs(settlementAmount).toLocaleString()}`}
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
    </div>
  );
};
