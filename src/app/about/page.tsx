"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./about.module.css";

type TabId = "about" | "quote" | "disclaimer" | "privacy";

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState<TabId>("about");

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>サイト情報 | Streak Navi</h1>

      {/* タブナビゲーション */}
      <div className={styles.tabs}>
        <div
          className={`${styles.tab} ${activeTab === "about" ? styles.active : ""}`}
          onClick={() => setActiveTab("about")}
        >
          このサイトについて
        </div>
        <div
          className={`${styles.tab} ${activeTab === "quote" ? styles.active : ""}`}
          onClick={() => setActiveTab("quote")}
        >
          引用について
        </div>
        <div
          className={`${styles.tab} ${activeTab === "disclaimer" ? styles.active : ""}`}
          onClick={() => setActiveTab("disclaimer")}
        >
          免責事項
        </div>
        <div
          className={`${styles.tab} ${activeTab === "privacy" ? styles.active : ""}`}
          onClick={() => setActiveTab("privacy")}
        >
          プライバシーポリシー
        </div>
      </div>

      {/* コンテンツエリア */}
      <main>
        {/* このサイトについて */}
        <section className={`${styles.tabContent} ${activeTab === "about" ? styles.active : ""}`}>
          <h2 className={styles.accentTitle}>このサイトについて</h2>
          <p>
            本Webアプリは、Swing Streak Jazz Orchestra（以下、当バンド）のメンバー専用に制作された内部ツールです。演奏曲の投票やアンケート、メンバー間の共有などを円滑にするための非公開アプリケーションです。
          </p>
          <p>
            サイトにアクセスできるのは、招待を受けたバンドメンバーのみであり、外部の方の利用は想定しておりません。
          </p>
          <p>
            アカウント識別のため、LINEログインを使用し、ユーザーの基本情報をもとにアカウントを識別・記録します。取得した情報はすべて暗号化・ハッシュ化され、安全にFirestoreデータベースに保存されます。
          </p>
          <p>
            本アプリは営利を目的としておらず、バンド活動の円滑化と楽しさの向上を目的とした非公開ツールです。
          </p>
        </section>

        {/* 引用・楽譜の取り扱いについて */}
        <section className={`${styles.tabContent} ${activeTab === "quote" ? styles.active : ""}`}>
          <h2 className={styles.accentTitle}>引用・楽譜の取り扱いについて</h2>
          <p>
            当サイトでは、演奏予定の楽曲や参考資料として、音源・動画・歌詞・コード譜・楽譜データなどの一部を保管・共有しています。
            これらは <strong>著作権法第32条（引用）</strong> およびサークル活動の私的利用範囲に基づき、バンド内での学習・練習目的に限定して使用しています。
          </p>

          <h3 className={styles.accentTitle}>引用・共有対象の例</h3>
          <ul>
            <li>楽曲タイトル・歌詞・参考音源リンク（YouTube等）</li>
            <li>サークル演奏用の譜面データ（PDF、パート譜、コード譜）</li>
            <li>演奏指示（構成・アーティキュレーションなど）に関する補足資料</li>
          </ul>

          <h3 className={styles.accentTitle}>利用の目的と運用方針</h3>
          <ul>
            <li>バンドメンバーが楽曲の構成・雰囲気を把握し、合奏の質を高めるため</li>
            <li>サークル活動（練習および演奏）の目的に限定した利用</li>
            <li>外部への一般公開は行わず、認証されたメンバーのみにアクセス権を制限</li>
          </ul>

          <h3 className={styles.accentTitle}>⚠️ 厳守事項（部外者共有・転載の禁止）</h3>
          <p>
            著作権者の権利を保護するため、掲載されている譜面・音源データの<strong>外部転載、SNSへのアップロード、部外者への共有（チャットツール等での送信）は固く禁止</strong>します。
            また、<strong>退団・卒業された際は、端末にダウンロードされた手持ちのデータも含めて速やかに削除・破棄</strong>してください。
          </p>
        </section>

        {/* 免責事項 */}
        <section className={`${styles.tabContent} ${activeTab === "disclaimer" ? styles.active : ""}`}>
          <h2 className={styles.accentTitle}>免責事項</h2>
          <p>
            本サイトは、Swing Streak Jazz Orchestraメンバー専用の非公開アプリです。掲載される情報は、バンド活動の共有・連絡・準備のための内部情報であり、外部に向けた公式なものではありません。
          </p>
          <p>
            アプリ内に表示される情報の正確性や最新性については、できる限りの配慮をしておりますが、すべての内容を保証するものではありません。
          </p>
          <p>
            サービスの内容は予告なく変更・中断・削除される可能性があり、それによって生じた損害について一切の責任を負いません。
          </p>
        </section>

        {/* プライバシーポリシー */}
        <section className={`${styles.tabContent} ${activeTab === "privacy" ? styles.active : ""}`}>
          <h2 className={styles.accentTitle}>プライバシーポリシー</h2>
          <p>
            当サイトでは、LINEログインを通じて取得した最低限のユーザー情報（LINEのユーザーID、表示名など）およびプロフィール情報（氏名、パート、楽器、居住市区町村等）を、本人確認、アカウント識別、およびバンド運営（旅費精算・出欠連絡等）のために利用します。
          </p>
          <p>
            これらの情報はすべて暗号化およびハッシュ化された上で、安全なGoogle Cloud（Firebase Authentication / Cloud Firestore / Firebase Storage）に保存され、第三者に開示されることはありません。
          </p>
          <p>
            また、Firebase 各サービスを利用しており、サービスのプライバシーポリシーは、
            <a
              href="https://policies.google.com/privacy?hl=ja"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              Google プライバシーポリシー
            </a>
            をご確認ください。
          </p>
          <p>
            本アプリは非公開で運用されており、取得した情報は、バンド活動の目的以外に使用されることはありません。
          </p>
        </section>
      </main>

      <div className={styles.footerActions}>
        <Link href="/login" className={styles.backLink}>
          ← ログインに戻る
        </Link>
      </div>
    </div>
  );
}