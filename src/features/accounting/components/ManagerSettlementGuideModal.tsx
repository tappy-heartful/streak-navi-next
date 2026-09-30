"use client";

import React, { useState, useEffect } from "react";
import styles from "./ManagerSettlementGuideModal.module.css";

interface ManagerSettlementGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "overview" | "receive" | "send" | "auto_notice";

export const ManagerSettlementGuideModal: React.FC<ManagerSettlementGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Escキーで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="manager-guide-modal-title"
    >
      <div className={styles.modalContent}>
        {/* ヘッダー */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderLeft}>
            <div className={styles.headerIcon}>
              <i className="fa-solid fa-clipboard-check" />
            </div>
            <h3 id="manager-guide-modal-title" className={styles.modalTitle}>
              担当者向け 受け取り・送金手順
            </h3>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="閉じる"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* タブ切り替え */}
        <div className={styles.tabBar}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "overview" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <i className="fa-solid fa-list-check" />
            全体の流れ
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "receive" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("receive")}
          >
            <i className="fa-solid fa-arrow-down-to-bracket" />
            受け取り手順
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "send" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("send")}
          >
            <i className="fa-solid fa-paper-plane" />
            送金手順
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "auto_notice" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("auto_notice")}
          >
            <i className="fa-brands fa-line" style={{ color: "#06c755" }} />
            自動通知・注意点
          </button>
        </div>

        {/* モーダル本文 */}
        <div className={styles.modalBody}>
          <div className={styles.infoNotice}>
            <i className="fa-solid fa-circle-info" />
            <div>
              <strong>清算担当者以外のメンバーも閲覧可能です。</strong>
              <br />
              シーズン終了後の集金・返金の流れや、BOTによる自動通知の仕組みを把握するためのマニュアルとしてご活用ください。
            </div>
          </div>

          {/* タブ1: 全体の流れ */}
          {activeTab === "overview" && (
            <>
              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadge}>概要</span>
                  <h4 className={styles.stepTitle}>
                    <i className="fa-solid fa-user-tie" />
                    清算担当者の役割
                  </h4>
                </div>
                <p className={styles.stepDescription}>
                  シーズン中のバンド経費の精算を取りまとめる担当者です。
                  バンド平均負担額をもとに算出された各メンバーの「支払額」を集金し、「受取（返金）額」を対象メンバーへ送金して、全員の精算を完了させます。
                </p>
                <div className={styles.pointBox}>
                  <i className="fa-solid fa-robot" />
                  <div>
                    <strong>LINE BOTが自動連携:</strong> 集金案内や未精算のリマインドはBOTが自動でLINE送信するため、担当者が個別に強く催促する負担が大幅に軽減されています！
                  </div>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgeSecondary}>STEP 1</span>
                  <h4 className={styles.stepTitle}>
                    <i className="fa-solid fa-id-card" />
                    事前準備（PayPay IDの登録）
                  </h4>
                </div>
                <p className={styles.stepDescription}>
                  マイページ（プロフィール設定）でご自身の「PayPay ID」を登録しておきます。メンバーの送金画面やLINE自動アナウンスに担当者のIDが自動表示されます。
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgePurple}>STEP 2</span>
                  <h4 className={styles.stepTitle}>
                    <i className="fa-brands fa-line" />
                    シーズン切替時のLINE自動告知
                  </h4>
                </div>
                <p className={styles.stepDescription}>
                  3ヶ月ごとの切替日（1/1, 4/1, 7/1, 10/1）に、BOTがLINEグループへ前シーズンの確定結果、精算額一覧、担当者宛ての送金手順を自動アナウンスします。
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgeOrange}>STEP 3</span>
                  <h4 className={styles.stepTitle}>
                    <i className="fa-solid fa-wallet" />
                    受け取り（集金 ＆ エビデンス照合）
                  </h4>
                </div>
                <p className={styles.stepDescription}>
                  「支払」対象メンバーからPayPayで送金を受け取ります。送金画面のスクショ（エビデンス画像）がアプリに登録されたら入金履歴と照合します。未払いの人にはBOTが7日おきに個別LINEで自動催促します。
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgeGreen}>STEP 4</span>
                  <h4 className={styles.stepTitle}>
                    <i className="fa-solid fa-paper-plane" />
                    送金（返金 ＆ 受取証跡スクショの登録）
                  </h4>
                </div>
                <p className={styles.stepDescription}>
                  集まった資金から「受取」対象メンバーへPayPayで送金します。送金後、担当者が送金完了スクショをアプリの受取枠へアップロードします（アップロードするまでBOTから担当者にリマインドが届きます）。
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadge}>STEP 5</span>
                  <h4 className={styles.stepTitle}>
                    <i className="fa-solid fa-circle-check" />
                    精算完了
                  </h4>
                </div>
                <p className={styles.stepDescription}>
                  支払メンバー・受取メンバー全員の証跡が揃うと、シーズンのステータスが自動的に「終了(清算済)」に切り替わり完了となります！
                </p>
              </div>
            </>
          )}

          {/* タブ2: 受け取り手順 */}
          {activeTab === "receive" && (
            <>
              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgeSecondary}>手順 1</span>
                  <h4 className={styles.stepTitle}>自分のPayPay IDを確認・登録する</h4>
                </div>
                <p className={styles.stepDescription}>
                  担当者に就任したら、まずマイページ（プロフィール画面）で「PayPay ID」が登録されているか確認してください。
                </p>
                <div className={styles.tipBox}>
                  <i className="fa-solid fa-lightbulb" />
                  <div>
                    登録しておくと、各メンバーの「自分の精算見込み」画面や、シーズン切替時にLINEグループへ送信される自動案内文にあなたのPayPay IDが自動挿入され、スムーズに送金してもらえます。
                  </div>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgePurple}>手順 2</span>
                  <h4 className={styles.stepTitle}>LINEグループへの自動案内</h4>
                </div>
                <p className={styles.stepDescription}>
                  シーズン切替日（1/1, 4/1, 7/1, 10/1）に、BOTが自動でLINEグループへ精算結果・担当者のPayPay ID・送金手順を案内します。担当者が自分で一から告知文を作って流す必要はありません。
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgeOrange}>手順 3</span>
                  <h4 className={styles.stepTitle}>入金とエビデンス画像の突合（照合）</h4>
                </div>
                <p className={styles.stepDescription}>
                  メンバーは送金後、送金完了画面のスクリーンショットを「エビデンス画像」としてアプリにアップロードします。
                </p>
                <ul className={styles.stepDetailsList}>
                  <li>
                    PayPayアプリを開き、送金通知や受取履歴を確認します。
                  </li>
                  <li>
                    「会計詳細」画面の「精算対象メンバー」一覧で、アップロードされたエビデンスの<strong>「表示」</strong>ボタンを押し、送金者・金額・送金先が正しいか照合します。
                  </li>
                </ul>
                <div className={styles.pointBox}>
                  <i className="fa-solid fa-check-double" />
                  <div>
                    エビデンスが登録されると、メンバー名の横に緑色の「済」バッジが表示されます。
                  </div>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgePurple}>手順 4</span>
                  <h4 className={styles.stepTitle}>未入金者への自動リマインド機能</h4>
                </div>
                <p className={styles.stepDescription}>
                  支払が必要で、エビデンスが未登録のメンバーには、<strong>シーズン終了日の翌日から7日おき（7日後、14日後、21日後…）にBOTから個別LINEで自動催促</strong>が送信されます。
                </p>
                <div className={styles.tipBox}>
                  <i className="fa-solid fa-robot" />
                  <div>
                    担当者が直接催促の連絡をしなくてもシステムが自動フォローします。期日を大幅に過ぎても未入金の場合のみ、直接声かけや確認を行ってください。
                  </div>
                </div>
              </div>
            </>
          )}

          {/* タブ3: 送金手順 */}
          {activeTab === "send" && (
            <>
              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgeSecondary}>手順 1</span>
                  <h4 className={styles.stepTitle}>受取対象メンバーと金額を確認</h4>
                </div>
                <p className={styles.stepDescription}>
                  「会計詳細」画面の「精算対象メンバー」一覧で、<strong>「受取 ¥〇〇」</strong>（青文字・マイナス表示）となっているメンバーを確認します。
                </p>
                <ul className={styles.stepDetailsList}>
                  <li>立替支出を多く負担してくれたメンバーです。</li>
                  <li>表示されている金額が返金（送金）すべき金額です。</li>
                </ul>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgeGreen}>手順 2</span>
                  <h4 className={styles.stepTitle}>送金原資（集金状況）の確認</h4>
                </div>
                <p className={styles.stepDescription}>
                  支払対象メンバーからの集金が完了した（または大部分が集まり原資が手元にある）ことを確認してから送金を開始します。
                </p>
                <div className={styles.tipBox}>
                  <i className="fa-solid fa-circle-info" />
                  <div>
                    <strong>担当者自身の精算額について:</strong>
                    <br />
                    ・担当者自身が「受取」側の場合：集まったお金から自分の受取額を手元に残します。
                    <br />
                    ・担当者自身が「支払」側の場合：集まったお金に自分の支払分を足して送金原資とします。
                  </div>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgeGreen}>手順 3</span>
                  <h4 className={styles.stepTitle}>PayPayで各受取メンバーへ送金</h4>
                </div>
                <p className={styles.stepDescription}>
                  受取メンバーのPayPayアカウント（ID検索やLINEの送金リンク等）宛に指定金額を送金します。
                </p>
                <ul className={styles.stepDetailsList}>
                  <li>
                    相手のPayPay IDが不明な場合は、LINEで「PayPay受け取りリンク」を発行してもらうか、IDを教えてもらって送金してください。
                  </li>
                  <li>
                    送金完了画面（スクリーンショット）を保存しておきます。
                  </li>
                </ul>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgePurple}>手順 4</span>
                  <h4 className={styles.stepTitle}>
                    <i className="fa-solid fa-upload" />
                    【重要】受取証跡（送金スクショ）のアップロード
                  </h4>
                </div>
                <p className={styles.stepDescription}>
                  送金が完了したら、<strong>担当者がその送金完了スクショを「精算対象メンバー」一覧の該当メンバーのエビデンス枠からアップロード</strong>します。
                </p>
                <div className={styles.pointBox}>
                  <i className="fa-solid fa-bell" />
                  <div>
                    <strong>なぜアップロードが必要？</strong>
                    <br />
                    受取対象メンバーへの送金証跡が未アップロードのままだと、<strong>7日おきにBOTから担当者宛てに「受取証跡アップロードのお願い」の個別LINE催促が届きます</strong>。アップロードすると催促が止まり、精算完了となります。
                  </div>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgeGreen}>手順 5</span>
                  <h4 className={styles.stepTitle}>送金完了の連絡</h4>
                </div>
                <p className={styles.stepDescription}>
                  送金が完了したら、相手メンバーへ「精算分 ¥〇〇 をPayPayにて送金しました。ご確認ください」と一言連絡を入れます。
                </p>
              </div>
            </>
          )}

          {/* タブ4: 自動通知・注意点 */}
          {activeTab === "auto_notice" && (
            <>
              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgePurple}>自動化仕様</span>
                  <h4 className={styles.stepTitle}>
                    <i className="fa-brands fa-line" />
                    LINE BOTによる自動通知スケジュール
                  </h4>
                </div>
                <p className={styles.stepDescription}>
                  システム（Google Apps Script）が毎日定時実行され、以下のルールで自動通知を配信しています。
                </p>

                <div className={styles.scheduleBox}>
                  <div className={styles.scheduleItem}>
                    <span className={styles.scheduleTime}>3ヶ月に1回</span>
                    <div>
                      <strong>シーズン切替日（1/1, 4/1, 7/1, 10/1）</strong>
                      <br />
                      LINEグループへ前シーズンの総収支・平均額・各メンバーの精算額一覧・担当者のPayPay送金手順を自動投稿。
                    </div>
                  </div>

                  <div className={styles.scheduleItem}>
                    <span className={styles.scheduleTime}>毎日 朝9:00</span>
                    <div>
                      <strong>精算終了シーズンの未完了者リマインド（7日おき）</strong>
                      <br />
                      シーズン終了日翌日を起点として、<strong>7日おき（7日後、14日後、21日後…）</strong>に未完了者へ個別LINE通知を送信。
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgeOrange}>通知内容 1</span>
                  <h4 className={styles.stepTitle}>未入金メンバーへの個別LINE（本人宛て）</h4>
                </div>
                <p className={styles.stepDescription}>
                  「支払」が必要で、エビデンスが未登録のメンバー本人へ、7日おきに以下の催促LINEが自動送信されます（担当者自身の自己支払はスキップ）。
                </p>
                <div className={styles.msgPreview}>
                  お疲れ様です！Streak Navi コンシェルジュです🍀{"\n\n"}
                  【バランス会計・お支払いのお願い】{"\n"}
                  「〇〇シーズン」の支払が確認できていません。リンクよりお支払いをお願いします。🙇‍♂️{"\n"}
                  https://streak-navi.vercel.app/accounting/confirm?seasonId=...
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadgeGreen}>通知内容 2</span>
                  <h4 className={styles.stepTitle}>受取証跡未提出のリマインド（担当者宛て）</h4>
                </div>
                <p className={styles.stepDescription}>
                  「受取」対象メンバーへの送金証跡（スクショ）が未提出の場合、<strong>清算担当者へ</strong>7日おきに以下のLINEが自動送信されます。
                </p>
                <div className={styles.msgPreview}>
                  お疲れ様です！Streak Navi コンシェルジュです🍀{"\n\n"}
                  【バランス会計・受取証跡アップロードのお願い】{"\n"}
                  「〇〇シーズン」の〇〇さんへの受取証明（スクショ）が未提出です。送金後スクショアップロードをお願いします。🙇‍♂️{"\n"}
                  https://streak-navi.vercel.app/accounting/confirm?seasonId=...
                </div>
                <div className={styles.tipBox}>
                  <i className="fa-solid fa-lightbulb" />
                  <div>
                    受取対象メンバーへ送金したら、速やかにアプリで送金スクショを登録することで、このリマインドが届かなくなります。
                  </div>
                </div>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadge}>重要</span>
                  <h4 className={styles.stepTitle}>
                    <i className="fa-solid fa-triangle-exclamation" />
                    PayPayの送金・受取上限額に注意
                  </h4>
                </div>
                <p className={styles.stepDescription}>
                  PayPayには過去24時間・過去30日間の利用可能上限額が定められています。
                </p>
                <ul className={styles.stepDetailsList}>
                  <li>
                    本人確認（eKYC）が完了していない場合、受取や送金の上限額が制限されることがあります。
                  </li>
                  <li>
                    精算を取りまとめる担当者は、事前にPayPayアプリでの本人確認を完了しておくことを強く推奨します。
                  </li>
                </ul>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepBadge}>仕様</span>
                  <h4 className={styles.stepTitle}>
                    <i className="fa-solid fa-flag-checkered" />
                    ステータス自動完了の仕組み
                  </h4>
                </div>
                <p className={styles.stepDescription}>
                  過去シーズンの清算ステータスは、<strong>「支払が必要な全メンバーのエビデンス画像が登録された時点」</strong>で、自動的に「終了(清算済)」に切り替わります。
                </p>
              </div>
            </>
          )}
        </div>

        {/* フッター */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.closeFooterButton}
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
