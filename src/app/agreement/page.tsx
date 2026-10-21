'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/src/contexts/AuthContext"; // AuthContextをインポート
import { db } from "@/src/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  showSpinner,
  hideSpinner,
  showDialog,
  writeLog,
  setSession
} from '@/src/lib/functions';
import styles from './agreement.module.css';

export default function AgreementPage() {
  const router = useRouter();
  const [isAgreed, setIsAgreed] = useState(false);

  // AuthContextから情報を取得
  const { user, loading, refreshUserData } = useAuth();

  useEffect(() => {
    document.title = "ご利用規約 | Streak Navi";

    // Authの状態が確定し、かつログインしていない場合は戻す
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleAgree = async () => {
    if (!isAgreed || !user) return;

    showSpinner();
    try {
      // 1. Firestoreのユーザーデータを更新
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        agreedAt: serverTimestamp(),
      });

      // 2. ContextのuserDataを最新にする
      await refreshUserData();

      // 3. ログ記録
      await writeLog({
        dataId: user.uid,
        action: '利用規約同意',
        status: 'success',
      });

      // ログイン成功フラグ（演出用）
      setSession("fromLogin", "true");

      router.push(`/user/edit?uid=${user.uid}`);

    } catch (e: unknown) {
      console.error("Agreement update error:", e);
      const message = e instanceof Error ? e.message : String(e);
      await writeLog({
        dataId: user?.uid || 'unknown',
        action: '利用規約同意失敗',
        status: 'error',
        errorDetail: { message },
      });
      await showDialog("同意処理の保存に失敗しました。通信環境を確認してください。", true);
    } finally {
      hideSpinner();
    }
  };

  // 認証チェック中
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingText}>認証情報を確認中...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1>ご利用に関する同意</h1>
      </header>

      <main>
        <p>
          本Webアプリ「Streak Navi」は、Swing Streak Jazz Orchestra（以下、当バンド）のメンバー専用の内部活動ポータルです。<br />
          練習やライブの出欠管理、楽譜・音源の共有、選曲・譜割り、旅費・経費の清算、チケット管理などの円滑な運営のため、以下の規約に同意の上ご利用ください。
        </p>

        <section className={styles.agreementContent}>
          <h3 className={styles.sectionTitle}>1. 情報の取得と利用目的について</h3>
          <p>
            本人確認およびバンド活動運営のため、以下の情報を取得・保持します：
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}><strong>LINE連携情報：</strong>表示名、プロフィール画像、アカウント識別ID</li>
            <li className={styles.listItem}><strong>プロフィール情報：</strong>氏名、セクション（パート）、担当楽器、居住地（都道府県・市区町村：旅費補助算出用）、役職、PayPay ID（会計対象者のみ）</li>
            <li className={styles.listItem}><strong>活動・回答データ：</strong>イベント出欠・日程調整、選曲希望・投票、譜割り回答等</li>
            <li className={styles.listItem}><strong>会計・精算情報：</strong>立替経費申請データ、領収書・送金確認用スクリーンショット等</li>
            <li className={styles.listItem}><strong>セキュリティ・ログ情報：</strong>アクセスログ、譜面ダウンロードログ等</li>
          </ul>
          <p>取得した情報は以下の通り適切に管理・保護されます：</p>
          <ul className={styles.list}>
            <li className={styles.listItem}>バンド活動の円滑な運営およびアカウント識別のみに使用し、外部には一切公開されません</li>
            <li className={styles.listItem}>
              データは<strong>Google Cloudの安全なインフラ（Firebase Authentication / Cloud Firestore / Storage）</strong>にて厳格に暗号化・保護されます
            </li>
            <li className={styles.listItem}>法令に基づく場合を除き、第三者に提供・共有されることはありません</li>
          </ul>
        </section>

        <section className={styles.cautionBox}>
          <span className={styles.cautionTitle}>2. ⚠️ 譜面・音源データの取り扱いに関する厳守事項</span>
          <p style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>
            本システム上で共有・保管される譜面データ（PDF・画像）および参考音源は、著作権保護の観点から以下のルールを厳格に遵守してください：
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <strong>目的外利用の禁止：</strong>
              掲載されている譜面・音源データは、サークル活動（練習および演奏）の目的でのみご利用いただけます。
            </li>
            <li className={styles.listItem}>
              <strong>外部転載・部外者共有の禁止：</strong>
              データの外部への転載、SNSへのアップロード、部外者への共有（SNS・チャットツール等での送信）は固く禁止します。
            </li>
            <li className={styles.listItem}>
              <strong>退団時のデータ破棄：</strong>
              退団された場合は、手持ちの端末に保存されたデータも含めて速やかに削除・破棄してください。
            </li>
            <li className={styles.listItem}>
              <strong>ダウンロードログの記録：</strong>
              著作権保護および適正運用の確認のため、譜面ファイルの閲覧・ダウンロード時には監査ログ（実行者、日時、対象ファイル）が自動記録されます。
            </li>
          </ul>
        </section>

        <section className={styles.cautionBox}>
          <span className={styles.cautionTitle}>3. ⚠️ その他の注意事項・禁止事項</span>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <strong>過剰な個人情報の登録禁止：</strong>
              住所の番地以降、電話番号、マイナンバー、クレジットカード番号などの機密情報は入力しないでください。（※居住地は、旅費精算に使用するため市区町村名までを正確に入力してください）
            </li>
            <li className={styles.listItem}>
              <strong>会計・精算における不正行為の禁止：</strong>
              経費の虚偽申請、領収書や送金エビデンスの偽造・改ざん、および割り勘精算の意図的な遅延・未払いは禁止します。
            </li>
            <li className={styles.listItem}>
              <strong>アカウント貸与・不正操作の禁止：</strong>
              ログインアカウントを第三者（部外者）に貸与・譲渡することや、ブラウザツール等を用いたシステムの改ざん、不正アクセス試行を禁止します。
            </li>
            <li className={styles.listItem}>
              <strong>迷惑行為の禁止：</strong>
              他のメンバーが不快に感じるデータや、公序良俗に反する情報の登録・発言は禁止します。
            </li>
          </ul>
        </section>

        <p className={styles.footerText}>本アプリおよび当バンドの健全な運営のため、上記ルールを守ってご利用ください。</p>

        <div className={styles.checkboxContainer}>
          <label className={styles.label}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
            />
            上記の内容を理解し、同意します
          </label>
        </div>

        <div className={styles.buttonContainer}>
          <button
            className={`${styles.agreeButton} ${isAgreed && user ? styles.active : ''}`}
            disabled={!isAgreed || !user}
            onClick={handleAgree}
          >
            同意して進む
          </button>
        </div>

        <p className={styles.note}>
          詳細は{' '}
          <Link href="/about" target="_blank" className={styles.link}>
            サイト情報
          </Link>{' '}
          をご確認ください。
        </p>
      </main>

      <div className={styles.pageFooter}>
        <Link href="/login" className={styles.backLink}>
          ← ログインに戻る
        </Link>
      </div>
    </div>
  );
}