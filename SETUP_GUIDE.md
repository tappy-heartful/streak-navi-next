# Streak Navi (CANDY) 完全初期セットアップ＆環境構築ガイド
## 初学者のためのゼロから立ち上げるステップバイステップ・完全マニュアル

本ドキュメントは、ビッグバンド・音楽団体向け活動ポータル「**Streak Navi**（開発コードネーム: CANDY）」を、パソコンの初期設定から、外部クラウドサービス（Firebase・LINE・Groq）の契約・設定、Next.js 16 プロジェクトの構築、全自動BOT（GAS）の導入、そして世界中に公開（Vercel デプロイ）するまで、**プログラミング初学者でも迷わず1つずつ実行できるように、全コマンド・理由・注意点を徹底解説した完全マニュアル**です。

---

## 目次

1. [全体のアーキテクチャと「なぜこの構成なのか」](#1-全体のアーキテクチャとなぜこの構成なのか)
2. [全体セットアップの流れ（フロー図）](#2-全体セットアップの流れフロー図)
3. [Phase 1: パソコンの開発環境づくり（VS Code / Node.js / Git）](#phase-1-パソコンの開発環境づくりvs-code--nodejs--git)
   - 1.1. VS Code（エディタ）のインストールとおすすめ拡張機能
   - 1.2. Node.js（JavaScript実行エンジン）のインストール
   - 1.3. Git（バージョン管理）のインストールと初期設定
   - 1.4. 【重要】Windows PowerShell のセキュリティ制限解除
4. [Phase 2: GitHub リポジトリの開設（ソースコードの保管庫）](#phase-2-github-リポジトリの開設ソースコードの保管庫)
5. [Phase 3: Next.js 16 プロジェクトの作成とライブラリ導入](#phase-3-nextjs-16-プロジェクトの作成とライブラリ導入)
   - 3.1. プロジェクトの作成（`create-next-app`）
   - 3.2. 必要なライブラリのインストール（各ライブラリの役割解説）
   - 3.3. Git の初期コミットと GitHub への送信
6. [Phase 4: Firebase（データベース・ファイル保管庫）の開設と設定](#phase-4-firebaseデータベースファイル保管庫の開設と設定)
   - 4.1. Firebase プロジェクトの新規作成
   - 4.2. Web アプリ登録と接続情報の取得
   - 4.3. Firebase Authentication（会員認証）の有効化
   - 4.4. Cloud Firestore（データベース）の作成とセキュリティルール
   - 4.5. Firebase Storage（レシート・写真保管庫）の作成
   - 4.6. Firebase Admin SDK（管理者用マスターキー）の発行
7. [Phase 5: LINE Developers & LINE公式アカウントの設定](#phase-5-line-developers--line公式アカウントの設定)
   - 5.1. LINE 公式アカウントの作成
   - 5.2. LINE Developers 開発者登録とプロバイダー作成
   - 5.3. LINE ログイン チャネルの作成
   - 5.4. LINE Messaging API チャネルの設定（長期トークン発行）
8. [Phase 6: 超高速 AI コンシェルジュ（Groq API）のセットアップ](#phase-6-超高速-ai-コンシェルジュgroq-apiのセットアップ)
9. [Phase 7: 環境変数（.env.local）の作成とローカル起動確認](#phase-7-環境変数envlocalの作成とローカル起動確認)
   - 7.1. 「環境変数」とは何か？なぜ必要なのか？
   - 7.2. `.env.local` の作成コマンドと全設定値の解説
   - 7.3. ローカル開発サーバーの起動と画面確認
10. [Phase 8: Google Apps Script (GAS) 定期実行 Bot の配置](#phase-8-google-apps-script-gas-定期実行-bot-の配置)
    - 8.1. なぜ GAS を使うのか？
    - 8.2. GAS プロジェクトの作成とコード配置
    - 8.3. トリガー（全自動スケジュール実行）の設定
11. [Phase 9: Vercel への本番デプロイ（世界中へ公開）](#phase-9-vercel-への本番デプロイ世界中へ公開)
    - 9.1. Vercel と GitHub の連携
    - 9.2. 本番環境変数の設定
    - 9.3. LINE ログインの「本番コールバックURL」の追加
12. [Phase 10: 初回ログインと初期管理者の昇格](#phase-10-初回ログインと初期管理者の昇格)
13. [初学者が必ずハマる！トラブルシューティング＆FAQ](#初学者が必ずハマるトラブルシューティングfaq)

---

## 1. 全体のアーキテクチャと「なぜこの構成なのか」

Streak Navi は、以下のモダンな技術を組み合わせて構築されています。自前でサーバーマシンを契約・維持管理する必要がない**「サーバーレス構成」**を採用しており、運用コストをほぼゼロ（無料枠内）に抑えつつ、プロ仕様の高機能を実現しています。

| サービス / 技術 | 役割 | なぜこの技術を使うのか？（選定理由） |
| :--- | :--- | :--- |
| **Next.js 16 (App Router)** | Webアプリ本体（画面＋API） | スマホでも爆速で動き、SEOやPWA（アプリ化）に対応。React 19・最新Turbopackをフル活用できるため。 |
| **Firebase (Cloud Firestore)** | リアルタイムデータベース | メンバーの出欠や会計データを即座に同期。サーバー保守不要で、一定量まで無料で使えるため。 |
| **Firebase Authentication** | ログインセッション管理 | セキュアな認証状態を管理。自前でパスワード暗号化やトークン検証をする危険を排除できるため。 |
| **Firebase Storage** | 画像ファイル保存 | 会計のレシートやPayPay送金スクショを高速・安全に保管できるため。 |
| **LINE Login API** | ログイン・会員登録 | メンバーがパスワードを覚える必要がなく、LINEアプリをタップするだけでログインできるため。 |
| **LINE Messaging API** | LINEプッシュ通知 | 練習や出欠の締切、会計の未払いをメンバー個人のLINEや全体グループに自動で催促できるため。 |
| **Groq SDK (LLM)** | AIコンシェルジュ | Llama 3などの最新AIが1秒未満で爆速回答。「次回の練習はどこ？」等の質問に即答できるため。 |
| **Google Apps Script (GAS)** | 毎日の自動実行Bot | 24時間常時起動サーバーを立てると月額数千円かかるが、GASなら無料で指定日時に自動通知できるため。 |
| **Vercel** | クラウド公開プラットフォーム | GitHubにプログラムをプッシュするだけで、数秒で世界中に高速配信・HTTPS化してくれるため。 |

---

## 2. 全体セットアップの流れ（フロー図）

```mermaid
flowchart TD
    subgraph LocalEnv ["PCローカル環境準備"]
        A["1. VS Code / Node.js / Git インストール"] --> B["2. GitHub リポジトリ開設"]
        B --> C["3. Next.js 16 プロジェクト作成 & ライブラリ追加"]
    end

    subgraph CloudServices ["クラウド・外部連携設定"]
        D["4. Firebase 設定 (Auth / Firestore / Storage / 秘密鍵)"]
        E["5. LINE 設定 (ログインチャネル / Messaging API)"]
        F["6. Groq 設定 (AI APIキー取得)"]
    end

    subgraph Integration ["統合・起動確認"]
        C --> G["7. .env.local 作成 & ローカル起動確認 (npm run dev)"]
        D --> G
        E --> G
        F --> G
        G --> H["8. GAS Bot 定期実行の設置"]
        H --> I["9. Vercel デプロイ & LINE本番URL登録"]
        I --> J["10. 初回ログイン & 管理者フラグ付与"]
    end
```

---

## Phase 1: パソコンの開発環境づくり（VS Code / Node.js / Git）

プログラミングを行うための「3大必須ツール」をPCにインストールします。

### 1.1. VS Code（エディタ）のインストール
プログラムのソースコードを編集するための高機能テキストエディタです。
1. [Visual Studio Code 公式サイト](https://code.visualstudio.com/) にアクセスし、インストーラーをダウンロード。
2. インストール時のチェック（**Windowsの場合特に重要**）：
   - ✅「Code をアクションとしてエクスプローラーのファイルコンテキストメニューに追加する」
   - ✅「PATH への追加 (再起動後に使用可能)」
   に必ずチェックを入れて完了させてください。
3. **拡張機能のインストール**:
   VS Code を開き、左端のブロックアイコン（または `Ctrl+Shift+X` / Macは `Cmd+Shift+X`）から以下を検索して「Install」をクリック：
   - **ESLint**: コードの書き間違いや文法エラーを自動で赤波線で教えてくれます。
   - **Prettier - Code formatter**: 保存時にコードのインデントを自動で綺麗に整えます。
   - **Tailwind CSS IntelliSense**: デザイン用クラス名の補完候補を出してくれます。

### 1.2. Node.js（JavaScript実行エンジン）のインストール
パソコン上で Next.js や JavaScript を動かすための基盤ソフトウェアです。
1. [Node.js 公式サイト](https://nodejs.org/) にアクセスし、**「LTS（推奨版）」** をダウンロードしてインストール（Next.js 16 のため **v20 以上** を推奨）。
2. インストール完了後、ターミナル（PowerShell または ターミナル.app）を開いてバージョン確認コマンドを実行：
   ```bash
   node -v
   npm -v
   ```
   > **なぜこれをやるのか？**: `v20.x.x` のように数字が表示されれば、パソコンに正常に認識されている証拠です。

### 1.3. Git（バージョン管理ツール）のインストールと初期設定
ソースコードの変更履歴を保存し、いつでも過去の状態に戻せるようにするツールです。
1. [Git 公式サイト](https://git-scm.com/) からインストーラーをダウンロードし、基本的に「Next」連打でインストール。
2. ターミナルで初期設定コマンドを実行（あなたの名前とメールアドレスを登録）：
   ```bash
   git config --global user.name "Taro Yamada"
   git config --global user.email "taro@example.com"
   # 改行コードの自動変換設定 (Windowsの場合推奨)
   git config --global core.autocrlf true
   ```
3. 確認コマンド：
   ```bash
   git --version
   ```

### 1.4. 【重要】Windows PowerShell のセキュリティ制限解除（Windowsユーザーのみ）
Windows の初期状態では、セキュリティ機能により `npm` や `npx` コマンドがエラー（`スクリプトの実行が無効になっているため...`）で弾かれることがあります。
1. スタートボタンを右クリック → **「ターミナル（管理者）」** または **「PowerShell（管理者として実行）」** を開く。
2. 以下のコマンドを実行：
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. `[Y] はい` を入力して Enter。これで制限が解除されます。

---

## Phase 2: GitHub リポジトリの開設（ソースコードの保管庫）

Git で記録したプログラムを、インターネット上の安全な保管庫「GitHub」にバックアップ・共有します。

1. [GitHub](https://github.com/) でアカウントを作成・ログイン。
2. 右上の「+」アイコン → **「New repository」** をクリック。
3. 入力項目：
   - **Repository name**: `streak-navi`
   - **Public / Private**: 必ず **「Private」** を選択（団体専用の会員制アプリのため、部外者にソースコードを見られないように非公開にします）。
   - **Initialize this repository with**: すべて**チェックを入れない**（後から自分のPCからコードを送信するため）。
4. **「Create repository」** をクリック。
5. 作成後に表示される URL（例: `https://github.com/あなたのユーザー名/streak-navi.git`）をメモ帳などに控えておきます。

---

## Phase 3: Next.js 16 プロジェクトの作成とライブラリ導入

いよいよアプリの土台を作成します。

### 3.1. プロジェクトの作成（`create-next-app`）
ターミナルを開き、作業したいフォルダ（例: `Documents` など）に移動してから、公式初期化コマンドを実行します。

```bash
# 作業フォルダに移動 (例)
cd ~/Documents

# Next.js 16 アプリを新規作成
npx create-next-app@latest streak-navi
```

> **対話型プロンプトの回答（すべて公式推奨通りにします）**:
> - `Would you like to use TypeScript?` → **Yes**（型安全でバグを激減させるため）
> - `Would you like to use ESLint?` → **Yes**（構文チェックを自動化するため）
> - `Would you like to use Tailwind CSS?` → **Yes**（効率的にCSSスタイルを組むため）
> - `Would you like your code inside a \`src/\` directory?` → **Yes**（コード構成を整理するため）
> - `Would you like to use App Router? (recommended)` → **Yes**（Next.js の最新ルーティング機能）
> - `Would you like to use Turbopack for \`next dev\`?` → **Yes**（高速開発サーバー）
> - `Would you like to customize the import alias (@/*)?` → **No**（デフォルトの `@/` でOK）

### 3.2. 必要なライブラリのインストール
作成されたフォルダに移動し、本システムで利用する専用パッケージを一括インストールします。

```bash
# 作成したプロジェクトフォルダに入る
cd streak-navi

# 必要な外部ライブラリをまとめてインストール
npm install firebase firebase-admin groq-sdk jsqr qrcode.react @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/free-brands-svg-icons @fortawesome/react-fontawesome
```

#### 各ライブラリの役割と「なぜ必要なのか？」
- `firebase`: ブラウザから Firestore データベースの読み書きや、Storage への画像アップロードを行う公式部品。
- `firebase-admin`: サーバー側（Next.js の内部API）で動く特権部品。LINEログイン後に「Firebaseのログイン証明書（Custom Token）」を発行するために必須。
- `groq-sdk`: 超高速AIエンジン「Groq」を呼び出す公式部品。
- `jsqr`: スマホのカメラ映像からQRコードを読み取り、ライブ来場受付を即座に完了させる部品。
- `qrcode.react`: ライブチケット予約完了画面にQRコードを描画する部品。
- `@fortawesome/...`: メニューやボタンに統一感のあるプロっぽいアイコンを表示する部品。

### 3.3. Git の初期コミットと GitHub への送信
作成した土台コードを GitHub に保存します。

```bash
# ブランチ名を main に設定
git branch -M main

# リモート保管庫 (GitHub) の URL を紐付け (★あなたのURLに置き換えてください)
git remote add origin https://github.com/あなたのユーザー名/streak-navi.git

# すべてのファイルを記録対象にする
git add .

# 変更内容にメッセージを添えて記録
git commit -m "feat: initial commit with Next.js 16 and dependencies"

# GitHub にアップロード
git push -u origin main
```

---

## Phase 4: Firebase（データベース・ファイル保管庫）の開設と設定

Googleが提供するクラウド基盤「Firebase」を開設します。

### 4.1. Firebase プロジェクトの新規作成
1. [Firebase Console](https://console.firebase.google.com/) にアクセスし、Google アカウントでログイン。
2. **「プロジェクトを追加」** をクリック。
3. プロジェクト名を入力（例: `streak-navi-prod`）。
4. Google アナリティクス：有効化して「プロジェクトを作成」。

### 4.2. Web アプリ登録と接続情報の取得
1. プロジェクトトップ画面中央にある **Web アイコン `</>`** をクリック。
2. アプリのニックネーム（例: `Streak Navi Web`）を入力して「アプリを登録」。
3. 画面に表示される `firebaseConfig` の中身をメモ帳に控えます：
   ```javascript
   apiKey: "AIzaSy...",
   authDomain: "streak-navi-prod.firebaseapp.com",
   projectId: "streak-navi-prod",
   storageBucket: "streak-navi-prod.firebasestorage.app",
   messagingSenderId: "1234567890",
   appId: "1:1234567890:web:abcdef..."
   ```

### 4.3. Firebase Authentication（会員認証）の有効化
1. 左メニュー「構築」→ **「Authentication」** をクリック。
2. **「使ってみる」** をクリック。
3. サインイン方法（Sign-in method）タブを開き、ローカル開発時のテスト用として「メール/パスワード」または「匿名」を有効にしておくと便利です。
   > **なぜ必要なのか？**: LINE ログイン成功後、アプリは Firebase の「カスタムトークン発行機能」を利用してログイン状態を作ります。そのため Authentication がプロジェクトで有効化されている必要があります。

### 4.4. Cloud Firestore（データベース）の作成とセキュリティルール
1. 左メニュー「構築」→ **「Firestore Database」** をクリック。
2. **「データベースを作成」** をクリック。
3. ロケーション：必ず **`asia-northeast1 (Tokyo)`** を選択（日本国内からのアクセス速度を最速にするため）。
4. 本番環境ルールとして開始。
5. **セキュリティルールの反映**:
   プロジェクト内にある [firestore.rules](file:///c:/Users/tappy/Documents/repos/streak-navi/firestore.rules) の全内容をコピーし、Firestore 画面の「ルール」タブに貼り付けて「公開」をクリックします。
   > **なぜルールが重要なのか？**: 不正なユーザーが他人の経費データを書き換えたり、部外者が会員名簿を盗み見たりできないよう厳格にアクセス制御を行うためです。

### 4.5. Firebase Storage（レシート・写真保管庫）の作成
1. 左メニュー「構築」→ **「Storage」** をクリック。
2. **「使ってみる」** をクリックし、ロケーション `asia-northeast1 (Tokyo)` で作成。
3. 「ルール」タブを開き、以下を設定して「公開」：
   ```text
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
   > ログイン済みの会員だけが画像を閲覧・アップロードできるようにします。

### 4.6. Firebase Admin SDK（管理者用マスターキー）の発行
1. 画面左上の歯車アイコン → **「プロジェクトの設定」** を開く。
2. **「サービス アカウント」** タブをクリック。
3. Node.js が選択されていることを確認し、**「新しい秘密鍵の生成」** をクリック。
4. ダウンロードされた JSON ファイル（例: `streak-navi-prod-firebase-adminsdk-xxx.json`）をメモ帳やテキストエディタで開きます。
5. 以下の3つの項目をメモします：
   - `"project_id"`
   - `"client_email"`
   - `"private_key"` (長い RSA 秘密鍵文字列。`-----BEGIN PRIVATE KEY-----\n...` で始まる部分)

> [!CAUTION]
> この JSON ファイルは、データベースの全データを削除・操作できる最高権限のマスターキーです。**絶対に GitHub やメールで他人に共有しないでください。**

---

## Phase 5: LINE Developers & LINE公式アカウントの設定

メンバーがスマホからワンタップでログインし、プッシュ通知を受け取れるようにします。

### 5.1. LINE 公式アカウントの作成
1. [LINE Official Account Manager](https://manager.line.biz/) にアクセス。
2. **「アカウントを作成」** をクリックし、アカウント名（例: `Streak Navi`）を登録。
3. 作成後、右上の設定（歯車）→「応答設定」を開く：
   - 応答モード: **「チャット」**
   - Webhook: **「オン」**（通知連携に必須）

### 5.2. LINE Developers 開発者登録とプロバイダー作成
1. [LINE Developers コンソール](https://developers.line.biz/console/) にアクセスし、LINEアカウントでログイン・開発者登録。
2. **「新規プロバイダー作成」** をクリック（名前例: `Streak Navi Operations`）。

### 5.3. LINE ログイン チャネルの作成
1. 作成したプロバイダー内で **「新規チャネル作成」** → **「LINEログイン」** を選択。
2. アプリタイプ: **「ウェブアプリ」** を選択。
3. 基本設定タブから以下を控えます：
   - **チャネルID**（数字の文字列）
   - **チャネルシークレット**（英数字の文字列）
4. **「LINEログイン設定」** タブを開く：
   - **コールバックURL** の「編集」をクリックし、以下を入力して更新：
     ```text
     http://localhost:3000/callback
     ```
     *(※本番公開後に、VercelのURL `https://xxx.vercel.app/callback` もここに追加します)*
5. **「リンクされた公式アカウント」の設定（超重要）**:
   - 先ほど 5.1 で作成した公式アカウントを選択・連携します。
   > **なぜこれをやるのか？**: アプリログイン時に「公式アカウントの友だち追加」を自動で促すためです。公式アカウントと友だちになっていないユーザーにはプッシュ通知が届かないため、この連携が必須となります。

### 5.4. LINE Messaging API チャネルの設定（長期トークン発行）
1. プロバイダー内に自動生成された（または公式アカウントと紐付いた）**「Messaging API」** チャネルを開く。
2. **「Messaging API設定」** タブの一番下までスクロール。
3. **「チャネルアクセストークン（長期）」** の「発行」ボタンをクリック。
4. 表示された非常に長いトークン文字列を控えます。

---

## Phase 6: 超高速 AI コンシェルジュ（Groq API）のセットアップ

1. [Groq Cloud Console](https://console.groq.com/) にアクセスし、Google アカウント等でサインアップ。
2. 左メニュー **「API Keys」** を開く。
3. **「Create API Key」** をクリックし、名前（例: `streak-navi-ai`）を付けて作成。
4. 表示された `gsk_...` で始まる API キーをコピーして控えます。

> **なぜ Groq なのか？**: OpenAI (ChatGPT) だと回答までに3〜5秒待たされますが、Groq は専用LPUチップにより**約0.3秒で回答が完了**します。スマホで利用するバンドメンバーに待たされるストレスを与えません。

---

## Phase 7: 環境変数（.env.local）の作成とローカル起動確認

### 7.1. 「環境変数」とは何か？なぜ必要なのか？
APIキーやデータベースの秘密鍵をプログラムのコード内に直接書いてしまうと、GitHub にアップロードした瞬間に世界中に漏洩してしまいます。
そのため、プログラム本体からは外部の `.env.local` という隠しファイルを読み込む構造にします。

- `NEXT_PUBLIC_` で始まる変数: ブラウザ（利用者のスマホ）に届いても安全な公開情報。
- `NEXT_PUBLIC_` が付いていない変数: サーバーの中だけで厳重に秘密にするマスターキー。

### 7.2. `.env.local` の作成コマンド
プロジェクトのルート（`streak-navi` フォルダ内）で `.env.local` を作成します。

```bash
# ファイルを作成 (VS Codeで開く場合)
code .env.local
```

ファイルの中に、これまで控えた値を当てはめて保存します：

```env
# =============================================================
# 1. Firebase Client SDK (公開情報)
# =============================================================
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="streak-navi-prod.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="streak-navi-prod"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="streak-navi-prod.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
NEXT_PUBLIC_FIREBASE_APP_ID="1:1234567890:web:abcdef..."
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"

# =============================================================
# 2. Firebase Admin SDK (サーバー専用・秘密鍵)
# =============================================================
FIREBASE_PROJECT_ID="streak-navi-prod"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@streak-navi-prod.iam.gserviceaccount.com"
# 注意: 改行はそのまま \n という2文字として記述してください
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# =============================================================
# 3. LINE 連携設定
# =============================================================
# LINE Login チャネル情報
LINE_CLIENT_ID_NAVI="2000000000"
LINE_CLIENT_SECRET_NAVI="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# LINE Messaging API チャネルアクセストークン
LINE_INDIV_ACCESS_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# LINE UID ハッシュ化用ソルト＆ペッパー (推測不能な長めのランダム英数字を設定)
SALT="your_secure_random_salt_string_here_32chars"
PEPPER="your_secure_random_pepper_string_here_32chars"

# =============================================================
# 4. AI (Groq) 設定
# =============================================================
GROQ_API_KEY="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# =============================================================
# 5. アプリケーション基底URL (ローカル環境)
# =============================================================
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

> **SALTとPEPPERとは？**:
> LINEの内部ユーザーID（生UID）をそのままデータベースに保存せず、ハッシュ関数（SHA-256）で暗号化して保存するために使います。万が一データベースが覗き見られても、LINEの個人アカウントが特定されないための最高水準のセキュリティ対策です。

### 7.3. ローカル開発サーバーの起動と画面確認

```bash
npm run dev
```

ターミナルに `Ready in ...ms` と表示されたら、ブラウザ（Chrome等）を開いて以下のアドレスにアクセスします：
👉 **http://localhost:3000**

ログイン画面やトップ画面が正常に表示されれば、ローカル環境の構築は大成功です！

---

## Phase 8: Google Apps Script (GAS) 定期実行 Bot の配置

メンバーへの出欠締切催促や、会計の送金リマインドを毎日自動でチェックしてLINEに送るBotを配置します。

### 8.1. なぜ GAS を使うのか？
AWS や VPS などの常時起動サーバーを契約すると月額費用がかかりますが、Google Apps Script を利用すれば、**Google のインフラ上で完全無料で毎日決まった時間にスクリプトを実行**できます。

### 8.2. GAS プロジェクトの作成手順
1. [Google ドライブ](https://drive.google.com/) を開く。
2. 左上「+ 新規」→「その他」→ **「Google Apps Script」** をクリック。
3. プロジェクト名を `Streak Navi Bot` に変更。
4. **Firestore ライブラリの導入**:
   - 左側メニューの「ライブラリ +」をクリック。
   - スクリプトID欄に以下を入力して「検索」：
     ```text
     1VUSl4b1r1eoNcRWotZM3e87ygkxvXStO7DAJwaPZdsXX
     ```
   - 最新バージョン（Version 34等）を選択して「追加」。
5. **スクリプトの貼り付け**:
   本プロジェクトの `gas/` フォルダにある各ファイルの内容を貼り付けます：
   - [【Navi_01】AutoNotice_LINE_Bot.js](file:///c:/Users/tappy/Documents/repos/streak-navi/gas/【Navi_01】AutoNotice_LINE_Bot.js): 出欠・日程調整・選曲・投票の締切通知
   - [【Navi_02】Accounting_Bot.js](file:///c:/Users/tappy/Documents/repos/streak-navi/gas/【Navi_02】Accounting_Bot.js): バランス会計の四半期シーズン作成＆送金リマインド
   - [【Navi_03】Todo_Bot.js](file:///c:/Users/tappy/Documents/repos/streak-navi/gas/【Navi_03】Todo_Bot.js): 親子TODOの期日リマインド
6. スクリプト先頭の接続定数（Firebase のメール、秘密鍵、プロジェクトID、LINEアクセストークン等）を `.env.local` の値に合わせて書き換えます。

### 8.3. トリガー（定期実行）の設定
1. GAS 画面左側の時計アイコン **「トリガー」** をクリック。
2. 右下「トリガーを追加」をクリック：
   - 実行する関数: `execAutoNotification`
   - イベントのソース: **「時間主導型」**
   - タイプ: **「日ベースのタイマー」**
   - 時間: **「午前 9 時〜10 時」**
3. 保存をクリック（Google アカウントの承認画面が出たら許可します）。
これで毎朝自動的に締切チェックが行われ、対象者にLINE通知が届きます。

---

## Phase 9: Vercel への本番デプロイ（世界中へ公開）

スマホから誰でもアクセスできるように、Next.js 開発元のホスティングサービス「Vercel」にデプロイします。

### 9.1. Vercel と GitHub の連携
1. [Vercel 公式サイト](https://vercel.com/) にアクセスし、「Sign Up」→「Continue with GitHub」で登録・ログイン。
2. ダッシュボードの **「Add New...」** → **「Project」** をクリック。
3. リストから先ほど作成した `streak-navi` リポジトリの **「Import」** をクリック。

### 9.2. 本番環境変数の設定
1. デプロイ設定画面の **「Environment Variables」** アコーディオンを開く。
2. Phase 7 で作成した `.env.local` の中身を、Key と Value としてすべて登録します。
3. **注意点**:
   - `NEXT_PUBLIC_BASE_URL` は、最初は空欄または仮のURLにし、デプロイ完了後に発行された本番ドメイン（例: `https://streak-navi-xxx.vercel.app`）に変更して再デプロイしてください。

### 9.3. デプロイ実行
- **「Deploy」** ボタンをクリック。
- 1〜2分でビルドが完了し、紙吹雪のアニメーションとともに本番URLが発行されます！

### 9.4. LINE ログインの「本番コールバックURL」の追加
1. [LINE Developers コンソール](https://developers.line.biz/console/) を開く。
2. LINE ログインチャネルの「LINEログイン設定」→「コールバックURL」の「編集」をクリック。
3. Vercel で発行された本番URLを追加：
   ```text
   https://streak-navi-xxx.vercel.app/callback
   ```
4. 「更新」をクリック。これでスマートフォンから本番環境へのLINEログインが正常に動くようになります！

---

## Phase 10: 初回ログインと初期管理者の昇格

アプリに最初にログインしたユーザーは一般権限です。全体の管理（マスタ設定、ユーザー承認、スコア管理等）を行えるように特権管理者に昇格させます。

1. スマートフォンまたはPCから、本番URL（または `http://localhost:3000`）を開く。
2. LINEログインを実行し、初期プロフィール（氏名、パートなど）を登録。
3. [Firebase Console](https://console.firebase.google.com/) を開く。
4. **「Firestore Database」** → **`users`** コレクションを開く。
5. 作成されたご自身のドキュメントを選択。
6. 「フィールドを追加」をクリック：
   - フィールド名: `isSystemAdmin`
   - タイプ: `boolean`
   - 値: `true`
7. 保存後、アプリの画面をリロード（再読み込み）します。
ヘッダーやメニューに「管理者専用メニュー」が表示され、すべての機能が解放されます！

---

## 初学者が必ずハマる！トラブルシューティング＆FAQ

### Q1. `npm run dev` でエラーが出て起動しない！
- **原因1**: Node.js のバージョンが古い可能性があります。`node -v` を確認し、v20 以上にアップデートしてください。
- **原因2**: `node_modules` の依存関係が壊れている場合があります。以下のコマンドでリセットしてみてください：
  ```bash
  # 依存関係を一度削除して再インストール
  rm -rf node_modules package-lock.json
  npm install
  npm run dev
  ```

### Q2. LINEログインボタンを押すと「400 Bad Request」と表示される！
- **原因**: LINE Developers に登録した「コールバックURL」と、ブラウザでアクセスしているURLが一致していません。
- **解決策**:
  - ローカルの場合: `http://localhost:3000/callback`
  - 本番の場合: `https://あなたのアプリ.vercel.app/callback`
  - ※末尾にスラッシュ（`/`）が付いているかいないかも厳密にチェックされます。

### Q3. LINEログインしようとすると「403 (NOT_FRIEND)」と表示される！
- **原因**: 公式アカウントをまだ友だち追加していません。
- **解決策**: 本システムは、プッシュ通知を確実に届けるため「公式アカウントの友だち追加」を必須にしています。LINE公式アカウントのQRコードから友だち追加を行ってから、再度ログインしてください。

### Q4. Firebase Admin SDK で「Invalid private key」エラーが出る！
- **原因**: `.env.local` に貼り付けた `FIREBASE_PRIVATE_KEY` の改行コードが崩れている典型的なミスです。
- **解決策**: 秘密鍵は `-----BEGIN PRIVATE KEY-----\nMIIEvg...` のように、改行部分を文字の `\n` として1行にまとめて記述してください。

### Q5. 変更したコードが Vercel に反映されない！
- **解決策**: コードを編集した後は、Git でコミットして GitHub にプッシュする必要があります：
  ```bash
  git add .
  git commit -m "fix: デザイン修正"
  git push origin main
  ```
  GitHub にプッシュされると、Vercel が自動で検知して数分で本番サイトを最新化してくれます。
