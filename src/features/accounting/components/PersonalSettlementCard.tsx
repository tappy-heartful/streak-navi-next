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
  isHome?: boolean;
  managerName?: string;
  managerPaypayId?: string;
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
  isHome = false,
  managerName,
  managerPaypayId,
}) => {
  if (!season) return null;

  return (
    <div className={`${isHome ? styles.homeCardWrapper : styles.personalCardWrapper} ${styles[seasonKey] || ""}`}>
      <div className={`${styles.card} ${styles.personalSection}`}>
        <div className={styles.cardHeaderInfo}>
          <div className={styles.cardSeasonTitle}>{seasonName}</div>
          <div className={styles.cardPeriodText}>{periodStr}</div>
        </div>

        <h3 className={styles.sectionTitle}><i className="fa-solid fa-scale-balanced" style={{ marginRight: "0.5rem" }} />自分の精算見込み</h3>
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

        {/* 送金手順ガイド（支払いがある場合のみ表示） */}
        {settlementAmount > 0 && (
          <div className={styles.paymentGuideBox}>
            <p className={styles.guideTitle}><i className="fa-solid fa-circle-info"></i> 送金手順</p>
            <ol className={styles.guideList}>
              <li>PayPayアプリを開く</li>
              <li>「送る」タブを選択</li>
              <li>
                {managerPaypayId
                  ? <><strong>「{managerPaypayId}」</strong>({managerName || "担当者"})を検索</>
                  : <>{managerName ? `「${managerName}」` : "担当者"}を検索</>
                }
              </li>
              <li><strong>¥{settlementAmount.toLocaleString()}</strong> を送金</li>
            </ol>
            <div style={{ marginTop: "12px", textAlign: "center" }}>
              <a
                href="paypay://"
                className={styles.button}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  padding: "8px 16px",
                  background: "#ff0033",
                  color: "#fff",
                  borderRadius: "20px",
                  fontWeight: "bold"
                }}
              >
                PayPayアプリを開く
              </a>
            </div>
          </div>
        )}

        <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <Link href="/expense-apply?mode=new" style={{ textDecoration: "none" }}>
            <button className={`${styles.button} ${styles.primaryButton}`} style={{ width: "100%" }}>
              <i className="fa-solid fa-receipt"></i> 収入/支出を登録する
            </button>
          </Link>

          {isHome && (
            <Link href={`/accounting/confirm?seasonId=${season.id}`} style={{ textDecoration: "none" }}>
              <button className={`${styles.button} ${styles.outlineButton}`} style={{ width: "100%", background: "transparent", border: "1px solid var(--season-primary)", color: "var(--season-primary)" }}>
                <i className="fa-solid fa-scale-balanced"></i> 会計詳細を確認する
              </button>
            </Link>
          )}
        </div>
        <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "12px" }}>
          ※承認済みの経費のみ計上されています。
        </p>
      </div>
    </div>
  );
};
