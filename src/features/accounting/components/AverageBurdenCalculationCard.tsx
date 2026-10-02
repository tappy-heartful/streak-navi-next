"use client";

import React, { useState } from "react";
import styles from "./AverageBurdenCalculationCard.module.css";
import { AccountingSeasonKey } from "@/src/lib/firestore/types";

interface AverageBurdenCalculationCardProps {
  totalExpenses: number;
  totalIncomes: number;
  netTotal: number;
  memberCount: number;
  averageBurden: number;
  onShowExpensesDetail?: () => void;
  onShowIncomesDetail?: () => void;
  seasonKey?: AccountingSeasonKey;
}

export const AverageBurdenCalculationCard: React.FC<AverageBurdenCalculationCardProps> = ({
  totalExpenses,
  totalIncomes,
  netTotal,
  memberCount,
  averageBurden,
  onShowExpensesDetail,
  onShowIncomesDetail,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={styles.card}>
      <div className={styles.header} onClick={() => setIsOpen(!isOpen)}>
        <div className={styles.titleArea}>
          <div className={styles.titleIcon}>
            <i className="fa-solid fa-calculator" />
          </div>
          <div>
            <h3 className={styles.title}>平均負担額の算出手順</h3>
            <div className={styles.subtitle}>
              全体の支出・収入から1人あたりの負担額を決定する計算ロジック
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.toggleBtn}
          aria-expanded={isOpen}
          aria-label={isOpen ? "算出手順を折りたたむ" : "算出手順を展開する"}
        >
          <span>{isOpen ? "閉じる" : "詳細を見る"}</span>
          <i
            className={`fa-solid ${isOpen ? "fa-chevron-up" : "fa-chevron-down"}`}
            style={{ fontSize: "0.75rem" }}
          />
        </button>
      </div>

      {isOpen && (
        <div className={styles.content}>
          <div className={styles.leadDescription}>
            バランス会計では、シーズン中のバンド活動で発生した全支出から全収入を差し引き、
            <strong>精算対象メンバー全員で均等に頭割り（端数切り捨て）</strong>した金額を「平均負担額」として定めます。
          </div>

          <div className={styles.stepList}>
            {/* STEP 1: 全体支出 */}
            <div className={styles.stepItem}>
              <div className={styles.stepHeader}>
                <div className={styles.stepLeft}>
                  <span className={`${styles.stepBadge} ${styles.stepBadgeExpense}`}>STEP 1</span>
                  <span className={styles.stepTitle}>全体支出の集計</span>
                </div>
                {onShowExpensesDetail && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowExpensesDetail();
                    }}
                    className={styles.detailButton}
                  >
                    <span>支出の内訳</span>
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: "0.65rem" }} />
                  </button>
                )}
              </div>
              <div className={styles.stepDesc}>
                シーズン期間中に対象メンバーから申請・承認された立替経費（練習会場費、旅費補助、ライブ関連費など）の合計です。
              </div>
              <div className={styles.stepFormulaBox}>
                <span className={styles.formulaText}>対象メンバーによる承認済み経費合計</span>
                <span className={`${styles.stepAmount} ${styles.amountExpense}`}>
                  ¥{totalExpenses.toLocaleString()}
                </span>
              </div>
            </div>

            {/* コネクタ: マイナス */}
            <div className={styles.stepConnector}>
              <i className="fa-solid fa-minus" />
            </div>

            {/* STEP 2: 全体収入 */}
            <div className={styles.stepItem}>
              <div className={styles.stepHeader}>
                <div className={styles.stepLeft}>
                  <span className={`${styles.stepBadge} ${styles.stepBadgeIncome}`}>STEP 2</span>
                  <span className={styles.stepTitle}>全体収入（返金・売上）の集計</span>
                </div>
                {onShowIncomesDetail && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowIncomesDetail();
                    }}
                    className={styles.detailButton}
                  >
                    <span>収入の内訳</span>
                    <i className="fa-solid fa-chevron-right" style={{ fontSize: "0.65rem" }} />
                  </button>
                )}
              </div>
              <div className={styles.stepDesc}>
                ライブチケット売上や参加費、返金など、バンド全体に入った収入の合計です。実質負担額から差し引かれます。
              </div>
              <div className={styles.stepFormulaBox}>
                <span className={styles.formulaText}>バンド全体および代表受取の収入合計</span>
                <span className={`${styles.stepAmount} ${styles.amountIncome}`}>
                  - ¥{totalIncomes.toLocaleString()}
                </span>
              </div>
            </div>

            {/* コネクタ: イコール */}
            <div className={styles.stepConnector}>
              <i className="fa-solid fa-equals" />
            </div>

            {/* STEP 3: 実質負担総額（純支出） */}
            <div className={styles.stepItem}>
              <div className={styles.stepHeader}>
                <div className={styles.stepLeft}>
                  <span className={`${styles.stepBadge} ${styles.stepBadgeNet}`}>STEP 3</span>
                  <span className={styles.stepTitle}>実質負担総額（純支出）の算出</span>
                </div>
              </div>
              <div className={styles.stepDesc}>
                全体支出から全体収入を差し引いた、バンド全体で分担・負担すべき実質的な金額です。
              </div>
              <div className={styles.stepFormulaBox}>
                <span className={styles.formulaText}>
                  全体支出 (¥{totalExpenses.toLocaleString()}) - 全体収入 (¥{totalIncomes.toLocaleString()})
                </span>
                <span className={`${styles.stepAmount} ${styles.amountNet}`}>
                  = ¥{netTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* コネクタ: 割り算 */}
            <div className={styles.stepConnector}>
              <i className="fa-solid fa-divide" />
            </div>

            {/* STEP 4: 平均負担額（頭割り） */}
            <div className={`${styles.stepItem} ${styles.highlightStep}`}>
              <div className={styles.stepHeader}>
                <div className={styles.stepLeft}>
                  <span className={`${styles.stepBadge} ${styles.stepBadgeAverage}`}>STEP 4</span>
                  <span className={styles.stepTitle}>精算対象メンバー数で均等割（平均負担額）</span>
                </div>
                <div className={styles.summaryBadge}>
                  <i className="fa-solid fa-users" /> 対象 {memberCount} 名
                </div>
              </div>
              <div className={styles.stepDesc}>
                実質負担総額を精算対象メンバー数で均等に割り、1人あたりの基準負担額を決定します（1円未満切り捨て）。
              </div>
              <div className={`${styles.stepFormulaBox} ${styles.highlightFormulaBox}`}>
                <div>
                  <span className={styles.formulaText}>
                    実質負担総額 (¥{netTotal.toLocaleString()}) ÷ 対象人数 ({memberCount}名)
                  </span>
                  <div style={{ fontSize: "0.75rem", color: "#6b46c1", marginTop: "2px" }}>
                    ※ Math.floor による切り捨て処理
                  </div>
                </div>
                <span className={`${styles.stepAmount} ${styles.amountAverage}`}>
                  ¥{averageBurden.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* 個人の精算への接続説明 */}
          <div className={styles.footerNote}>
            <i className="fa-solid fa-circle-info" />
            <div>
              <strong>個人の精算額の決まり方:</strong>
              <br />
              各メンバーの「精算額」は、この
              <strong>【平均負担額（¥{averageBurden.toLocaleString()}）】</strong>
              から、各人がシーズン中に立替えた
              <strong>【個人の支出 - 個人の収入】</strong>
              を差し引いて算出されます。
              <br />
              差額がプラスであれば「支払」、マイナスであれば「受取（返金）」となります。
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
