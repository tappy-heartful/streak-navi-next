// app/agreement/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/src/lib/functions';
import styles from './agreement.module.css';

export default function AgreementPage() {
  const router = useRouter();
  const [isAgreed, setIsAgreed] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    // セッションからUIDを取得（なければログインへ戻す）
    const storedUid = getSession('uid');
    if (!storedUid) {
      router.push('/login');
    } else {
      setUid(storedUid);
    }
  }, [router]);

  const handleAgree = () => {
    if (!isAgreed || !uid) return;
    
    // 既存：ユーザ編集画面へ（isInit=trueを付与）
    // Next.jsではクエリパラメータとして渡す
    router.push(`/user-edit?isInit=true&uid=${uid}`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1>ご利用に関する同意</h1>
      </header>

      <main>
        <p>
          本Webアプリ「Streak Navi」は、Swing Streak Jazz Orchestraのメンバー専用の非公開ツールです。
        </p>

        <section>
          <h3 className={styles.sectionTitle}>LINE情報の取得について</h3>
          <p>
            本人確認およびログイン管理のため、LINEアカウントから以下の情報を取得します：
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>表示名</li>
            <li className={styles.listItem}>プロフィール画像</li>
            <li className={styles.listItem}>ユーザーID</li>
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
              <strong>個人情報の登録禁止：</strong>
              住所、電話番号、マイナンバー、クレジットカード情報などの個人情報は絶対に入力しないでください。
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

        <p>本アプリの円滑な運営のため、上記ルールを守ってご利用ください。</p>

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
            className={styles.agreeButton} 
            disabled={!isAgreed}
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