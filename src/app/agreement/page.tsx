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
          本Webアプリ「Streak Navi」は、Swing Streak Jazz Orchestraのメンバー専用の非公開ツールです。<br />
          活動の運営（旅費精算、連絡等）のため、氏名、パート、居住地（都道府県・市区町村）などの情報を登録いただきます。
        </p>

        <section className={styles.agreementContent}>
          <h3 className={styles.sectionTitle}>情報の取得と利用目的について</h3>
          <p>
            本人確認および活動運営のため、以下の情報を取得・保持します：
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}><strong>LINE連携情報：</strong>表示名、プロフィール画像、ユーザーID</li>
            <li className={styles.listItem}><strong>プロフィール情報：</strong>氏名、セクション、楽器、居住地（都道府県・市区町村）、PayPay ID（対象者のみ）</li>
          </ul>
          <p>取得した情報は以下の通り適切に保護されます：</p>
          <ul className={styles.list}>
            <li className={styles.listItem}>アカウント識別のみに使用し、バンド外には一切公開されません</li>
            <li className={styles.listItem}>
              情報は<strong>Googleの提供する安全なクラウドストレージ（Firebase）</strong>にて暗号化・保護して保存されます
            </li>
            <li className={styles.listItem}>第三者に提供・共有されることはありません</li>
          </ul>
        </section>

        <section className={styles.cautionBox}>
          <span className={styles.cautionTitle}>⚠️ 注意事項と禁止事項</span>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <strong>詳細な個人情報の登録禁止：</strong>
              住所の番地以降、電話番号、マイナンバー、クレジットカード情報などの個人情報は事前承諾なく入力しないでください。（※居住地は、旅費精算に使用するため市区町村名までを正確に入力してください）
            </li>
            <li className={styles.listItem}>
              <strong>迷惑行為の禁止：</strong>
              他の利用者が不快に感じるデータや、公序良俗に反する情報の登録は禁止します。
            </li>
            <li className={styles.listItem}>
              <strong>不正操作の禁止：</strong>
              ブラウザの開発者ツール等を用いたシステムの改ざんや、不正なアクセス試行を禁止します。
            </li>
          </ul>
        </section>

        <p className={styles.footerText}>本アプリの円滑な運営のため、上記ルールを守ってご利用ください。</p>

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