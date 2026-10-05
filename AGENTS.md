# これはあなたが知っているNext.jsではありません

このバージョンには破壊的変更が含まれています。API、コンベンション、およびファイル構造はすべて、あなたの学習データと異なる場合があります。コードを記述する前に、`node_modules/next/dist/docs/` にある関連ガイドを必ず読んでください。非推奨の警告には厳格に従ってください。

# Agent Behavior Rules
1. **実装プランの承認プロセス省略**: Implementation Plan（実装プラン）を作成した後、ユーザーの明示的な承認を待つ必要はありません。プランを提示（または作成）したら、そのまま連続してタスクの実行（コードの修正等）に進んでください。
2. **モバイル向けUI設計の徹底**: スマートフォンでの表示崩れを防ぐため、フィルターバッジやボタン等のUI要素が画面幅で見切れたり不自然に折り返したりしないように常に設計に配慮してください。必要に応じて要素を別行にするか、スクロール可能なコンテナに格納するなど、モバイルファーストでの実装を徹底してください。
3. **PCシステムおよびネットワーク操作の絶対禁止**: PC本体のシステム設定、ハードウェア構成、またはネットワーク状態を変更するコマンドの実行やアクションは絶対に禁止します。タスクの解釈ミスによってホストシステムを変更すると、システムエラーを引き起こします。
   - `netsh`、`ipconfig /renew`、`ifconfig`、`systemctl restart network` などのネットワークアダプター、Wi-Fi設定、ファイアウォール構成を無効化、リセット、または変更するコマンドは**絶対に実行しないでください**。
   - ハードウェアドライバーのアンインストール、再インストール、アップデートは**絶対に行わないでください**。
   - プロジェクトディレクトリ外のOSレベルのシステムファイルの変更、システム全体の再起動やシャットダウンは**絶対に実行しないでください**。
   - 通信エラーやAPIエラーが発生した場合は、ホストマシンの設定を変更するのではなく、プロジェクト内のアプリケーションコードや設定を修正するか、ユーザーに指示を仰いでください。
4. **自動ビルド検証**: ユーザーの指示に基づいてコードを修正した後は、必ず自動的に `npm run build` を実行してビルドエラーがないか確認してください。もしエラーが発生した場合は、ユーザーに報告する前に**必ず自らエラーを解消し、再度ビルドが通ることを確認**してから完了報告を行うこと。
5. **Firestoreルールの自動更新**: 新機能の追加、新しいコレクションやサブコレクションの導入、あるいは既存コレクションのアクセス要件変更が発生した際は、必ず `firestore.rules` もセットで確認・更新してください。クライアントSDKからの読み取り・書き込み権限（認証必須、ロール・管理者権限、所有者判定など）を過不足なく定義し、本番環境での Permission Denied エラーやセキュリティホールを未然に防止すること。

---

# STREAK NAVI (CANDY) プロジェクト完全仕様・再現設計書

本ドキュメントは、ビッグバンド・音楽団体向け活動ポータル「**Streak Navi**（開発コードネーム: CANDY）」の全容、設計思想、アーキテクチャ、技術的工夫、およびゼロから完全に再構築・再現するための実装仕様を網羅的に記録したものである。

---

## 1. プロジェクト基本概要

### 1.1. システムの目的
「Streak Navi」は、社会人ビッグバンド（Swing Streak Jazz Orchestra）の日常運営・ライブ制作・会計清算・メンバー間の情報共有を一元化するプロ仕様の活動ポータルWebアプリケーションである。
メンバーがスマートフォンからストレスなく利用できるモバイルファーストのUI/UX、LINEとのシームレスな統合（認証・通知）、PWAによるアプリ同等の体験、そしてLLMを活用したAIコンシェルジュ機能を兼ね備えている。

### 1.2. 主要技術スタック
| カテゴリ | 採用技術 | バージョン/詳細 |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Turbopack) | `16.1.6` |
| **UI Library** | React / React DOM | `19.2.3` |
| **Language** | TypeScript | `^5` (Strict モード運用) |
| **BaaS / Database** | Firebase SDK / Cloud Firestore / Firebase Storage | `^12.8.0` |
| **Server Admin** | Firebase Admin SDK | `^13.6.1` (サーバーサイド専用) |
| **外部連携 (LINE)** | LINE Login API v2.1 / LINE Messaging API | Pushメッセージ chunk送信、OAuth State管理 |
| **AI / LLM** | Groq SDK (`groq-sdk`) | `^1.1.2` (超高速推論AIコンシェルジュ) |
| **QR / スキャン** | `jsqr` / `qrcode.react` | カメラ動的ロードによるQR受付 / 予約QR生成 |
| **PWA** | Service Worker / Web App Manifest | `/sw.js` + `manifest.ts` (スタンドアロン起動) |
| **Styling** | CSS Modules + Tailwind CSS v4 | `*.module.css` 必須運用、`@tailwindcss/postcss` |
| **Icons / Assets** | Font Awesome 6 (Solid / Brands) | 全タイトル・アクションのアイコン統一 |

---

## 2. 全体アーキテクチャ (Core Architecture)

### 2.1. Feature-based Architecture (機能別垂直分割)
機能単位でロジックとUIを完全カプセル化し、保守性と再利用性を最大化する。

```
src/
├── app/                      # ルーティング定義 (薄い Server Component)
│   ├── (各機能パス)/page.tsx # SSR/SSG、revalidate、初期データ取得
│   ├── ClientLayout.tsx      # 全体クライアントシェル (AuthGuard, Header, Footer, ChatBot)
│   ├── globals.css           # 共通デザイントークン、スピナー、アニメーション
│   └── api/                  # APIルート (chat, line/login, line/get-url 等)
├── features/                 # 機能ごとの垂直スライス
│   └── <feature_name>/
│       ├── api/
│       │   ├── *-server-actions.ts  # サーバーサイド処理 ("use server", server-only)
│       │   └── *-client-service.ts  # クライアントサイドFirestore書き込み・取得
│       ├── components/              # 機能固有のUIコンポーネント
│       ├── views/                   # 画面別クライアントコンポーネント
│       │   ├── *ListClient.tsx      # 一覧画面ビュー
│       │   ├── *EditClient.tsx      # 編集・新規画面ビュー
│       │   └── *ConfirmClient.tsx   # 詳細・確認画面ビュー
│       ├── lib/                     # 検索・ソートエンジン、集計ロジック
│       └── types/                   # 機能固有の型定義
├── components/               # アプリ全体共通コンポーネント
│   ├── Form/                 # AppInput, FormField, FormFooter
│   ├── Layout/               # EditFormLayout, ConfirmLayout, SearchableListLayout
│   ├── List/                 # ListFilterGrid, ListRow, ListCell
│   ├── CommonDialog.tsx      # showDialog() によるプロミスベースの共通ダイアログ
│   ├── CommonModal.tsx       # showModal() によるプロミスベースの共通モーダル
│   └── Chat/ChatBot.tsx      # 常駐型AIコンシェルジュ
├── contexts/                 # AuthContext (RBAC自動導出), BreadcrumbContext
├── hooks/                    # useAppForm (依存型バリデーション), useSearchableList
└── lib/                      # Firebase初期化, line.ts, functions.ts, validation.ts
```

### 2.2. システム連携構成図 (Mermaid)

```mermaid
graph TD
    User([メンバー / スマホブラウザ / PWA])
    LINE[LINE 公式アカウント / LINE Login API]
    NextApp[Next.js 16 App Router]
    FAuth[Firebase Authentication]
    FS[(Cloud Firestore)]
    FStorage[(Firebase Storage)]
    FAdmin[Firebase Admin SDK]
    GroqAPI[Groq LLM API]

    User -->|LINEでログイン| NextApp
    NextApp -->|OAuth State / Token交換 / 友だち確認| LINE
    NextApp -->|Custom Token発行| FAdmin
    NextApp -->|signInWithCustomToken| FAuth
    User -->|PWAセッション同期| FS
    NextApp -->|画像圧縮後アップロード| FStorage
    NextApp -->|RLSセキュリティルールを尊重したREST取得| FS
    NextApp -->|コンテキスト注入 & 高速推論| GroqAPI
    NextApp -->|リマインド通知 chunk分割送信| LINE
```

---

## 3. 認証・認可アーキテクチャ (Auth, LINE, RBAC, PWA)

### 3.1. LINE ログイン & 安全な UID 設計
- **フロー**:
  1. `api/line/get-url`: ランダムな `state`（16バイトhex）を発行し、Firestore `oauthStates` に格納。LINE 認可URLを生成（`bot_prompt=aggressive` を付与して友だち追加を強く推奨）。
  2. LINEログイン完了後、`/callback` から `api/line/login` (POST) を呼び出す。
  3. **State の使い捨て検証**: Firestore の `oauthStates` から合致するドキュメントを取得し、即時削除。
  4. **Friendship Status API の検証**: `https://api.line.me/friendship/v1/status` を呼び出し、公式アカウントを友だち追加していない場合は `403 (NOT_FRIEND)` を返して登録を制限。
  5. **UID のソルト＋ペッパー ハッシュ化**:
     - LINEの生UID（`sub`）をそのまま使わず、環境変数 `SALT` + `rawLineUid` + `PEPPER` を SHA-256 でハッシュ化して Firebase UID (`hashedUserId`) とする。個人情報漏洩・外部トラッキングを遮断。
  6. **Firebase Custom Token の発行**: `adminAuth.createCustomToken(hashedUserId)` でトークンを生成しクライアントに返却。
  7. **通知用IDの紐付け**: `lineMessagingIds/{hashedUserId}` に `{ lineUid: rawLineUid, isNavi: true }` を保存。プッシュ通知送信時に参照。

### 3.2. PWA × OAuth クロスコンテキスト自動同期機構
- **課題**: iOS/Android の PWA（スタンドアロンモード）から外部の LINE ログインへ飛ぶと、Safari/Chrome などの外部ブラウザが起動し、ログイン完了しても PWA 本体のセッションに反映されない。
- **解決策**:
  1. PWA 側で起動時に一意の `pwaSessionId` を生成し、ログインURLのリクエストに含めて `oauthStates` に記録。
  2. 外部ブラウザでログインが成功した際、`api/line/login` が `pwaAuthSessions/{pwaSessionId}` ドキュメントに `customToken` とステータスを書き込む。
  3. PWA 側は Firestore の `pwaAuthSessions/{pwaSessionId}` をリアルタイム監視（`onSnapshot`）しており、書き込みを検知した瞬間に `signInWithCustomToken` を実行して自動ログインを完結させる。

### 3.3. モジュール別 RBAC (Role-Based Access Control)
`AuthContext` が現在の URL パス（例: `/score/...` なら `Score` モジュール）からモジュールを判定し、ユーザーの権限フラグを参照して `isAdmin` を動的に提供する。

- **特権管理者**: `userData.isSystemAdmin === true`（すべての画面で `isAdmin === true` となる）
- **モジュール管理者**: `isScoreAdmin`, `isEventAdmin`, `isCallAdmin`, `isVoteAdmin`, `isStudioAdmin`, `isUserAdmin`, `isNoticeAdmin`, `isBlueNoteAdmin`, `isBoardAdmin`, `isLiveAdmin`, `isTicketAdmin`, `isMediaAdmin`, `isTravelSubsidyAdmin`, `isIssueAdmin`

### 3.4. AuthGuard によるインターセプト
未ログイン時の `/login` リダイレクトに加え、以下の厳格なガードを自動適用：
1. **利用規約同意チェック**: `userData.agreedAt` が未設定の場合、ダイアログを表示して `/agreement` または `/login` へリダイレクト。
2. **必須プロフィール補完チェック**:
   - `sectionId`（パート）, `roleId`（役職）, `abbreviation`（短縮名）, `instrumentIds`（担当楽器）が未設定の場合、強制的に `/user/edit` へ誘導。
   - **サックスパート特有ルール**: `sectionId === "1"`（サックスパート）の場合は会計精算の受取用に `paypayId` の登録を必須とする。

---

## 4. 技術的な工夫・特筆すべき実装パターン (Innovations & Best Practices)

### 4.1. AIコンシェルジュ (ChatBot + Groq SDK + RLS尊重 REST API)
- **RLS (Row Level Security) 尊重アーキテクチャ**:
  - AIチャット (`/api/chat`) で Firebase Admin SDK を用いて全データを取得すると、他人の非公開経費やプライベート情報が AI に漏洩するリスクがある。
  - そこで、クライアントから渡された Firebase Auth の **IDトークン (Bearer)** を使用し、**Firestore REST API (`https://firestore.googleapis.com/v1/...`)** を経由してデータを取得。
  - Firestore のセキュリティルールが完全に適用され、ユーザー本人にアクセス権があるドキュメントのみが AI のコンテキストとして注入される安全設計。
- **レスポンス内内部リンクのカード化**:
  - LLM が返答したマークダウンリンク `[ラベル](/path)` をクライアント（`ChatBot.tsx`）が正規表現で検出し、アプリ内の `<Link href={path}>` カードコンポーネントとしてレンダリング。回答から対象画面へワンタップで遷移できる。

### 4.2. バランス会計システム (Balance Accounting)
- **頭割り相殺ロジック**:
  - シーズン（春・夏・秋・冬の四半期）ごとに、メンバーの立替経費（支出）とライブ売上等の収入を合算し、参加メンバー数で均等割した平均負担額（`averageBurden`）を算出。
  - 各個人の立替拠出額（`myContribution`）との差額から、「支払うべき金額（マイナスなら受取額）」を完全自動計算。
- **PayPay 送金 & エビデンス画像承認フロー**:
  - サックスパートから選出されたシーズン会計担当者（Manager）の PayPay ID へ送金。
  - メンバーは送金完了スクリーンショットをアップロード（後述の画像圧縮を経て Storage に保存）。
  - 会計担当者はエビデンス一覧を確認し、ステータスを承認・清算完了（`settledAt`）に更新する。
- **シーズンに応じたテーマカラー**:
  - 春（ピンク）、夏（スカイブルー）、秋（オレンジ/アンバー）、冬（ネイビー/パープル）と、シーズンに応じたテーマカラーを動的に適用。

### 4.3. 旅費補助の自動算出 & ルート地図表示
- **自動入力連携**:
  1. 新規申請時、ログインユーザーの登録居住地（`users/{uid}/private/location`）から**出発地（都道府県・市区町村）**を自動補完。
  2. イベントを選択すると、そのイベントの開催地（`prefectureId`, `municipalityId`）および開催日を**到着地**へ自動補完。
  3. 出発地と到着地が決まると、旅費補助マスタ（`travelSubsidies`）を自動照会し、補助金額を自動セット。
  4. `TravelRouteMap` コンポーネントにより、出発地から到着地までの移動経路を視覚的に表示。

### 4.4. クライアントサイド事前画像圧縮 (`compressImage`)
- **Canvas ベースの軽量化**:
  - レシート写真や送金スクリーンショット（数MB〜数十MB）を、アップロード前に HTML5 Canvas で長辺最大1000px、JPEG品質0.7にリサイズ・圧縮。
  - アップロード時間を大幅短縮し、Firebase Storage の容量および転送コストを90%以上削減。

### 4.5. ボルダ得点法 (Borda Count) 投票エンジン
- **選曲投票の高度化**:
  - 単一選択（`single`）に加え、順位付け投票（`borda`）に対応。
  - 最大希望順位（`maxRanks`, 例: 3位まで）と配点ルール（`linear`: 3点, 2点, 1点 / `weighted`: 傾斜 5点, 3点, 1点）を設定可能。
  - ユーザーは選択肢をタップするだけで「第1希望」「第2希望」と自動割り当て・解除できる直感的なUI。
  - リアルタイムで Pt（ポイント）を集計し、選曲会議の意思決定を支援。

### 4.6. ライブ受付 QRスキャン (`jsqr` 動的インポート)
- **高速・低負荷なカメラ読み取り**:
  - 背面カメラ（`facingMode: "environment"`）を起動し、`<video>` フレームを `<canvas>` に描画。
  - `willReadFrequently: true` オプションと `requestAnimationFrame` で最適化。
  - 重い `jsqr` ライブラリは、カメラ起動ボタンが押された瞬間に `await import("jsqr")` で動的ロード（初期バンドルサイズの肥大化を防止）。
  - QRコード検出時に即時チェックイン処理を実行し、二重読み取りを防ぐためにカメラストリームを自動解放。

### 4.7. 譜割り管理 (Assign) の楽器別フィルタリング
- **誤操作防止の安全設計**:
  - ビッグバンドの全パート（サックス、トランペット、トロンボーン、リズム等）が表示される中、**ログインユーザーが担当している楽器（`myInstrumentIds`）に一致するパートのみを編集対象**として抽出。他パートの譜割りを誤って上書きする事故を未然に防止。
  - イベントのセットリスト全曲から YouTube の動画IDを抽出し、ワンクリックで全曲再生できるプレイリストURL（`youtube.com/watch_videos?video_ids=...`）を自動生成。

### 4.8. 親子TODOツリー (Issue WBS)
- **再帰的ツリー構築 (`buildTree`)**:
  - 親TODO（`parentId`）を持つサブタスクを再帰的にトラバースし、深さ（`depth`）に応じたインデントと視覚的階層表示を実現。
  - 公開範囲（全体 / 自パートのみ / ユーザー個別指定）の厳密な閲覧制御。

### 4.9. 安全なデータ削除 (論理アーカイブ) & 監査ログ
- **誤削除防止 (`archiveAndDeleteDoc`)**:
  - ドキュメント削除時は即座に物理削除せず、`archives/{collection}_{docId}_{timestamp}` に全データをコピー退避してから本番データを削除。万一の誤操作でも完全復旧が可能。
- **全自動ログ記録**:
  - 操作・エラーログ: `writeLog`（`logs` / `errorLogs` コレクション）
  - ページアクセスログ: `ClientLayout` の `RouteChangeListener` により、全画面の遷移時に `accessLogs` へ自動記録。

### 4.10. 日本標準時 (JST) 固定処理 & パフォーマンス最適化
- **タイムゾーン安全設計**:
  - クライアント端末のOS設定（海外時間等）やサーバーのUTC設定に左右されないよう、`getJSTDate`、`format`、`isInTerm`（受付期間判定）など、すべて `+09:00` オフセットを適用した JST 基準で処理。
- **不要なプリフェッチの抑制**:
  - ドロワーメニューやフッター、一覧内のリンクには `prefetch={false}` を付与。App Router のデフォルトプリフェッチによる Firestore の不要な読み取り課金・クォータ枯渇を徹底防止。
- **音楽特化スピナー (`showSpinner`)**:
  - 通信中は「チューニングしています...」「リードの調子を確認しています...」「アドリブを練っています...」など、50種類以上のバンドあるあるメッセージがランダムに切り替わるアニメーションを表示し、体感待機時間を軽減。

---

## 5. Firestore コレクション設計 (Data Models)

| コレクション名 | 用途 | 主なフィールド |
| :--- | :--- | :--- |
| `users` | ユーザー情報 | `displayName`, `pictureUrl`, `sectionId`, `roleId`, `instrumentIds`, `abbreviation`, `paypayId`, `agreedAt`, `isSystemAdmin`, 各種 `is*Admin` |
| `users/{uid}/private/location` | 居住地情報 (個人情報保護) | `prefectureId`, `municipalityId` |
| `scores` | 楽譜マスタ | `title`, `abbreviation`, `scoreUrl`, `genres`, `referenceTrack`, `youtubeId`, `isDispTop` |
| `events` | イベント・練習・本番 | `title`, `attendanceType` (出欠/日程調整), `date`, `candidateDates`, `placeName`, `prefectureId`, `municipalityId`, `setlist`, `instrumentConfig` |
| `eventAttendanceAnswers` | イベント出欠回答 | `eventId`, `uid`, `status`, `comment` |
| `eventAdjustAnswers` | 日程調整回答 | `eventId`, `uid`, `answers` (`{ "yyyy.MM.dd": statusId }`), `comment` |
| `assigns` | 譜割り | `eventId`, `songId`, `partName`, `userId`, `isRehearsal` |
| `lives` | ライブ公演情報 | `title`, `date`, `open`, `start`, `venue`, `advance`, `door`, `ticketStock`, `totalReserved` |
| `tickets` | ライブチケット予約 | `liveId`, `uid`, `reservationNo`, `resType` (一般/招待), `representativeName`, `companions`, `groups` |
| `liveCheckIns` | 来場チェックイン | `liveId`, `ticketId`, `reservationNo`, `name`, `type` (予約/当日) |
| `calls` | 選曲募集 | `title`, `acceptStartDate`, `acceptEndDate`, `items` (募集ジャンル), `isAnonymous` |
| `callAnswers` | 選曲応募データ | `uid`, `answers` (`{ [genre]: CallAnswerSong[] }`) |
| `votes` | 選曲投票 | `name`, `type` (single/borda), `bordaConfig` (`maxRanks`, `scoring`), `items` (`name`, `choices`) |
| `voteAnswers` | 投票回答 | `voteId`, `uid`, `answers` (`Record<itemName, choiceName or choiceNames[]>`) |
| `boards` | 掲示板 | `title`, `content`, `sectionId` (全体ならnull), `files` (`name`, `url`, `path`) |
| `issues` | 課題・TODO | `type` (todo/bug/question/proposal/request), `parentId`, `title`, `assigneeId`, `date`, `status`, `scope` (all/part/user), `steps` |
| `issueComments` | TODOコメント | `issueId`, `text`, `createdBy`, `createdByName` |
| `expenseApplies` | 経費申請 | `uid`, `typeId`, `categoryId`, `itemId`, `name`, `amount`, `date`, `status`, `isTravel`, `eventId`, 出発/到着地, `files`, `adminComment` |
| `expenseApplyHistories` | 経費審査履歴 | `type` (created/updated/reviewed/commented), `status`, `comment`, `actorId`, `actorName` |
| `accountingSeasons` | 会計シーズン清算 | `year`, `seasonKey` (spring/summer/autumn/winter), `memberIds`, `managerId`, `evidenceUrls`, `settledAt` |
| `incomes` | 団体収入 (チケット売上等) | `uid` (受取人), `title`, `amount`, `date`, `status` |
| `travelSubsidies` | 旅費補助額マスタ | `departurePrefectureId`, `departureMunicipalityId`, `arrivalPrefectureId`, `arrivalMunicipalityId`, `amount` |
| `notificationIndividualHistorys` | LINE通知送信履歴 (旧形式) | `messageId`, `content`, `sourceCollection`, `sourceDocId`, `title`, `sentAt` |
| `lineNotificationLogs` | LINE送信履歴・配信枠管理 | `accountType`, `accountName`, `notificationType`, `notificationTitle`, `recipientType`, `recipientUid`, `recipientName`, `recipientLineId`, `messages`, `messageCount`, `summary`, `status`, `sentAt`, `yearMonth`, `date` |
| `logs` / `errorLogs` | 操作・エラーログ | `uid`, `userName`, `action`, `dataId`, `status`, `errorDetail`, `createdAt` |
| `accessLogs` | 画面アクセスログ | `uid`, `userName`, `pathname`, `searchParams`, `createdAt` |
| `archives` | 削除データ退避 | `originalCollection`, `originalId`, `archivedAt`, 退避データ本文 |
| `oauthStates` | LINE OAuth State | `origin`, `redirectAfterLogin`, `pwaSessionId`, `createdAt` |
| `pwaAuthSessions` | PWAログイン同期 | `customToken`, `profile`, `status`, `uid`, `createdAt` |

---

## 6. 再構築・ゼロから再現するための手順 (Replication Guide)

### 6.1. プロジェクト初期化
```bash
# Next.js 16 + React 19 + TypeScript プロジェクト作成
npx -y create-next-app@latest streak-navi --typescript --eslint --no-tailwind --app --src-dir

# 依存パッケージのインストール
npm install firebase firebase-admin groq-sdk jsqr qrcode.react
npm install -D tailwindcss @tailwindcss/postcss postcss
```

### 6.2. 必要な環境変数 (`.env.local`)
```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...

# Firebase Admin SDK (Service Account JSON の内容)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# LINE API
LINE_CLIENT_ID_NAVI=200xxxxxxx
LINE_CLIENT_SECRET_NAVI=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LINE_INDIV_ACCESS_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# UID ハッシュ化用シークレット
SALT=your_secure_salt_string
PEPPER=your_secure_pepper_string

# LLM (Groq)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 6.3. Firestore セキュリティルール・設計のポイント
1. ユーザー自身のデータ (`users/{uid}`) は本人のみ更新可能、閲覧は認証済みメンバー全員。
2. 管理者フラグの更新は `isSystemAdmin` または `adminAuth`（サーバーサイド）のみ許可。
3. `archives`, `logs`, `notificationIndividualHistorys` はクライアントからの削除を禁止。

### 6.4. ビルド・検証・デプロイ
```bash
# 型チェックおよび Turbopack による本番ビルド検証
npm run build

# ローカル起動確認
npm run dev
```

---

## 7. まとめ
本プロジェクトは、単なるCRUDアプリにとどまらず、**「実運用でメンバーが毎日快適に使えること」「音楽活動特有の複雑な業務（譜割り・選曲投票・旅費・四半期精算）を完全自動化すること」「セキュリティとコスト効率を極限まで両立すること」** を徹底的に追求して構築されている。
再構築時は、上記のディレクトリ構成、アーキテクチャ規約、およびデータモデルに従うことで、同一の高品質なシステムを完全に再現することができる。