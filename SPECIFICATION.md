# STREAK NAVI (Swing Streak Jazz Orchestra) システム仕様書・設計書

---

## 1. システム全体概要

### 1.1. システム目的
「**Streak Navi**（開発コードネーム: CANDY）」は、社会人ビッグバンド（Swing Streak Jazz Orchestra）の日常運営・練習管理・ライブ制作・会計清算・メンバー間の情報共有を一元化するプロフェッショナル活動ポータルWebアプリケーションである。
メンバーがスマートフォンからストレスなく利用できるモバイルファーストのUI/UX、LINEとのシームレスな統合（認証・プッシュ通知）、PWAによるアプリ同等の快適な操作体験、そしてLLMを活用したAIコンシェルジュ機能を兼ね備えている。

### 1.2. 主要技術スタック
| カテゴリ | 採用技術 | バージョン/詳細 |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Turbopack) | `16.1.6` |
| **UI Library** | React / React DOM | `19.2.3` |
| **Language** | TypeScript | `^5` (Strict モード運用) |
| **BaaS / Database** | Cloud Firestore / Firebase Storage / Firebase Authentication | `^12.8.0` |
| **Server Admin** | Firebase Admin SDK | `^13.6.1` (サーバーサイド専用) |
| **外部連携 (LINE)** | LINE Login API v2.1 / LINE Messaging API | Pushメッセージ chunk送信、OAuth State管理 |
| **AI / LLM** | Groq SDK (`groq-sdk`) | `^1.1.2` (超高速推論AIコンシェルジュ) |
| **QR / スキャン** | `jsqr` / `qrcode.react` | カメラ動的ロードによるQR受付 / 予約QR生成 |
| **PWA** | Service Worker / Web App Manifest | `/sw.js` + `manifest.ts` (スタンドアロン起動) |
| **Styling** | CSS Modules + Tailwind CSS v4 | `*.module.css` 必須運用、`@tailwindcss/postcss` |
| **Icons / Assets** | Font Awesome 6 (Solid / Brands / Regular) | 全タイトル・アクションのアイコン統一 |

### 1.3. ブランディング & テーマカラー
- **プライマリカラー**: `#06c755`（LINE連携親和エメラルドグリーン） / `#059669` / `#10b981`
- **バランス会計シーズン別テーマカラー**:
  - 春（Spring）: `#ec4899`（サクラピンク）
  - 夏（Summer）: `#0284c7`（オーシャンブルー）
  - 秋（Autumn）: `#d97706`（アンバーオレンジ）
  - 冬（Winter）: `#6366f1`（インディゴパープル）
- **UI哲学**:
  - モバイルファーストでタップしやすいタッチターゲット（44px以上確保）。
  - 各種状態・バッジ・テーブルの見切れや不自然な縦折れを排除するレスポンシブ設計。
  - すべての画面で Font Awesome アイコン付きタイトル（`h1`）および同階層の `*.module.css` による美しいスタイリング。

### 1.4. 認証・認可アーキテクチャ (Auth, LINE, PWA, RBAC)
- **LINE ログイン & UID のソルト＋ペッパー ハッシュ化**:
  1. `/api/line/get-url`: 暗号論的疑似乱数による `state`（16バイトhex）を発行し、Firestore `oauthStates` に格納。友だち追加を促す `bot_prompt=aggressive` を付与してLINE認可URLを返却。
  2. 認可後、`/callback` から `/api/line/login` (POST) を呼び出し、State の使い捨て検証を実施。
  3. LINE公式アカウントの友だち追加状態（Friendship Status API）を検証。
  4. LINEの生UID（`sub`）をそのまま使わず、環境変数 `SALT` + `rawLineUid` + `PEPPER` を SHA-256 でハッシュ化して Firebase UID (`hashedUserId`) とする。個人情報漏洩・外部トラッキングを遮断。
  5. `adminAuth.createCustomToken(hashedUserId)` でカスタムトークンを発行し、クライアントで `signInWithCustomToken` を実行。
  6. 通知用IDマッピングとして `lineMessagingIds/{hashedUserId}` に `{ lineUid: rawLineUid, isNavi: true }` を保存。
- **PWA × OAuth クロスコンテキスト自動同期機構**:
  - スタンドアロン起動中のPWAから外部LINEログインに遷移した際、別ブラウザで完了した認証セッションをPWA側に反映させるため、`pwaSessionId` を発行。
  - 外部ブラウザ側のログイン成功時に `pwaAuthSessions/{pwaSessionId}` ドキュメントへ `customToken` を書き込み、PWA側の `onSnapshot` がそれを検知して自動ログインを完結。
- **AuthGuard によるインターセプト**:
  - 未ログイン時の `/login` 誘導。
  - 利用規約同意（`userData.agreedAt`）の未完了チェック。
  - 必須プロフィール補完チェック（パート `sectionId`、役職 `roleId`、略称 `abbreviation`、担当楽器 `instrumentIds`）。
  - サックスパート（`sectionId === "1"`）は精算受取用 `paypayId` の登録を必須化。

### 1.5. コールバック (`/callback`) & 利用規約 (`/agreement`) 画面
- **コールバック画面**: LINE認証結果の待機スピナー表示および認証エラー時の復帰案内。
- **利用規約画面**: バンド活動ポータルの利用規約条項と同意チェックボックスを設置。初回ログイン時に強制表示し、同意日時（`agreedAt`）を Firestore に記録。

### 1.6. 共通フィードバックUI (`CommonDialog` & `Spinner`)
- **共通ダイアログ (`CommonDialog` / `showDialog`)**:
  - Promise ベースの共通モーダルダイアログ。`alert()` の使用を禁止し、確認ダイアログや完了トーストを統一。
- **音楽特化スピナー (`Spinner` / `showSpinner`)**:
  - 画面ローディング中に「チューニングしています...」「リードの調子を確認しています...」「アドリブを練っています...」など、50種類以上のバンドあるあるメッセージがランダムに切り替わるアニメーションを表示。

### 1.7. ホーム画面 (`/`) & PWA ホーム画面追加案内
- **ウェルカムカード**: メンバーのLINEアバター、パート名、役職、担当楽器、直近の参加予定を表示。
- **PWA インストールガイド (`PwaInstallHint`)**:
  - iPhone / Android を自動判別し、ホーム画面への追加手順をアイコン付き3ステップで案内。
- **個人精算見込みカード (`PersonalSettlementCard`)**:
  - 現行および直近シーズンの精算見込み（支払額 / 受取額）を自動計算してダッシュボードに常時表示。
  - 支払いの場合は担当者の PayPay ID 表示・ワンタップコピー機能・PayPayアプリ起動リンクを完備。
- **クイックメニュー**: 演奏メニュー、活動メニュー、アプリメニュー、ホームページ連携、経費管理の各機能へスムーズにアクセス。

---

## 2. 管理者ロール・権限マトリクス (RBAC)

Streak Navi では、モジュールごとの細やかな権限分離（Role-Based Access Control）を採用している。
ユーザーコレクション（`users/{uid}`）内の各フラグによって、アクセスできる機能と操作権限が厳格に制御される。

### 2.1. 各種管理者ができることの一覧表

| 管理者ロール | 該当フラグ | できること（管理者権限） | 一般メンバー（権限なし時） |
| :--- | :--- | :--- | :--- |
| **特権管理者 (システム管理者)** | `isSystemAdmin` | **全機能の完全操作権限**（全モジュールの追加・編集・削除、全メンバーの権限付与・名簿編集・削除、システム設定、監査ログ閲覧） | - |
| **楽譜管理者** | `isScoreAdmin` | 楽譜マスタの新規登録・編集・PDF URL更新・YouTube音源紐付け・トップ表示設定・削除 | 楽譜一覧・PDF閲覧・ダウンロード、YouTube試聴 |
| **イベント管理者** | `isEventAdmin` | 練習・ライブ・イベントの新規作成・編集・削除・複製、全員の出欠/日程調整状況の集計・確認、録音リンクの代理削除 | 自身の出欠回答・日程調整回答の登録/修正/取消、録音リンクの追加、自身の録音リンク削除 |
| **譜割り管理者** | `isAssignAdmin` | イベント全曲・全パートの譜割り割り当て・変更、プレイリスト生成 | 自身が担当する楽器の譜割り閲覧・編集（誤操作防止フィルタ適用） |
| **曲募集管理者** | `isCallAdmin` | 選曲募集の新規作成・編集・削除・複製、全応募曲の集計確認・CSVエクスポート | 募集期間中の候補曲リクエスト応募・修正・取消 |
| **曲投票管理者** | `isVoteAdmin` | 投票（単一投票 / ボルダ得点法）の新規作成・編集・削除・複製、音源リンク一括編集、投票結果の集計確認 | 投票期間中の投票（順位付け / 単一選択）、投票取消 |
| **スタジオ管理者** | `isStudioAdmin` | リハーサルスタジオ情報・予約状況の登録・編集・削除 | スタジオ情報の閲覧、空き状況の確認 |
| **ライブ管理者** | `isLiveAdmin` | 公演情報の作成・編集・チケット券種/上限設定、来場QR受付管理 | ライブ情報の閲覧、チケット予約 |
| **チケット管理者** | `isTicketAdmin` | チケット予約一覧の確認・承認・ステータス更新・取り消し、受付チェックイン代行 | 自身のチケット予約・予約QRコード確認 |
| **掲示板管理者** | `isBoardAdmin` | 全体掲示板・パート掲示板の投稿作成・編集・削除、添付ファイル管理 | 閲覧、自身の投稿の作成・編集・削除 |
| **TODO管理者** | `isIssueAdmin` | 課題・TODO（WBSツリー）の新規作成・親タスク紐付け・全タスク編集・ステータス更新・削除 | 自身が担当するTODOの確認、コメント投稿、ステータス更新 |
| **経費管理者** | `isExpenseAdmin` | メンバーからの経費申請（立替/収入）の審査・承認・却下・コメント・履歴管理 | 自身の経費申請（立替/収入）の新規登録・修正・取消・エビデンス画像アップロード |
| **会計管理者** | `isAccountAdmin` | 会計シーズンの清算管理、清算担当者（Manager）の指名・変更、シーズン確定・清算完了更新 | 自身の精算見込み確認、PayPay送金・受取、送金エビデンス登録 |
| **旅費補助管理者** | `isTravelSubsidyAdmin` | 出発地・到着地ごとの旅費補助マスタ金額の登録・編集・削除 | 自身の旅費補助金額の自動照会・申請、移動ルート地図の確認 |
| **お知らせ管理者** | `isNoticeAdmin` | 全体お知らせ（Notice）の作成・配信・ピン留め・削除、自動通知設定（GAS連携）の確認 | お知らせの閲覧のみ |
| **今日の一曲管理者** | `isBlueNoteAdmin` | 「今日の一曲」選曲テーマの作成・編集・削除 | おすすめ曲の推薦投稿、試聴 |
| **メディア管理者** | `isMediaAdmin` | 写真・動画ギャラリーの新規作成・編集・削除 | 写真・動画の閲覧 |
| **LINE送信ログ管理者** | `isLineLogAdmin` | LINE送信履歴および月間配信枠消費状況の管理 | **閲覧可能**（一般メンバーも配信枠状況・メッセージサンプルの閲覧可能） |
| **名簿管理者** | `isUserAdmin` | 他メンバーの登録情報（パート、役職、楽器、略称、連絡先等）の代行編集・更新 | 自身のプロフィールの編集・登録のみ可（他メンバーは閲覧のみ） |

※ `isSystemAdmin === true` を保持するユーザーは、上記すべての管理者権限を自動的に内包する。

---

## 3. 実装済み機能仕様

### 3.1. 楽譜管理機能 (`/score`)
- **目的**: バンドの演奏レパートリー（スコア・パート譜）の集中保管と共有。
- **画面構成**:
  - 一覧: `/score` (曲名検索、略称検索、ジャンルフィルター、トップ表示バッジ)
  - 作成・編集: `/score/edit` (管理者専用: 曲名、略称、楽譜PDF URL、ジャンル、参考音源、YouTube動画ID、トップ表示フラグ)
  - 詳細・確認: `/score/confirm?scoreId=xxx` (楽譜情報、PDFダウンロード/閲覧、YouTubeプレイヤー埋め込み再生)

### 3.2. イベント・出欠・日程調整機能 (`/event`)
- **目的**: 練習、合宿、本番、ミーティングの日程連絡、出欠確認、日程調整、施設アクセス、録音・録画リンクの一元管理。
- **種別**:
  - **出欠確認 (`attendance`)**: 特定日の出席・欠席・保留をワンタップ回答。
  - **日程調整 (`schedule`)**: 複数の候補日に対する可否（◯/△/✕）をマトリクス形式で回答。
- **画面構成**:
  - 一覧: `/event` (日付順、都道府県/市区町村バッジ、出欠回答ステータスバッジ)
  - 作成・編集: `/event/edit` (タイトル、日時/候補日、場所・Google Map・アクセス、施設利用時間、会場押さえ状況、セットリスト、楽器構成)
  - 詳細・確認: `/event/confirm?eventId=xxx` (出欠集計、未回答者モーダル、日程調整マトリクス集計、録音リンク追加/削除、YouTubeタイムスタンプ再生)
  - 出欠回答: `/event/attendance-answer?eventId=xxx`
  - 日程調整回答: `/event/adjust-answer?eventId=xxx`

### 3.3. 譜割り管理機能 (`/assign`)
- **目的**: 演奏曲ごとの各パート（1st〜5th Sax, 1st〜4th Tp, 1st〜4th Tb, Rhythm等）の担当メンバー割り当て。
- **特徴・安全設計**:
  - **楽器連動型編集フィルタ**: ログインユーザーが担当している楽器（`myInstrumentIds`）に一致するパートのみを編集対象として抽出し、他パートの譜割りを誤って上書きする事故を未然防止。
  - **プレイリストURL自動生成**: セットリストの全曲からYouTube動画IDを抽出し、ワンクリックで全曲連続再生できるプレイリストURL（`youtube.com/watch_videos?video_ids=...`）を自動生成。
- **画面構成**:
  - 一覧: `/assign`
  - 編集: `/assign/edit?eventId=xxx`
  - 確認: `/assign/confirm?eventId=xxx`

### 3.4. 曲募集機能 (`/call`)
- **目的**: 定期演奏会やライブに向けた候補曲のリクエストをメンバーから募集。
- **画面構成**:
  - 一覧: `/call` (受付中 / 終了 / 全てのフィルタ、検索)
  - 作成・編集: `/call/edit` (管理者専用: タイトル、受付期間、募集ジャンル、匿名募集可否、その他備考)
  - 詳細・回答確認: `/call/confirm?callId=xxx` (応募状況集計、応募曲一覧、YouTubeリンク、CSVエクスポート)
  - 応募フォーム: `/call/answer?callId=xxx` (メンバーによる曲名、参考音源URL、楽譜状況、購入要否、備考の登録)

### 3.5. 曲投票機能 (`/vote`)
- **目的**: 募集された候補曲から、演奏曲を民主的かつ高精度に決定。
- **投票方式**:
  - **単一選択投票 (`single`)**: 各項目から1曲を選択。
  - **ボルダ得点法 (`borda`)**: 最大希望順位（例: 3位まで）を指定し、順位に応じたポイント（傾斜配点 / 等差配点）でリアルタイム集計。
- **画面構成**:
  - 一覧: `/vote` (受付中 / 終了 / 全てのフィルタ、検索)
  - 作成・編集: `/vote/edit` (管理者専用: タイトル、投票方式、配点ルール、候補曲リスト)
  - 詳細・集計結果: `/vote/confirm?voteId=xxx` (順位別・得点順集計グラフ/テーブル、YouTube埋め込み再生)
  - 投票フォーム: `/vote/answer?voteId=xxx` (ワンタップ順位割り当て・解除)
  - 音源リンク一括編集: `/vote/link-edit?voteId=xxx` (管理者専用)

### 3.6. スタジオ予約管理 (`/studio`)
- **目的**: リハーサルスタジオ情報（アクセス、料金、機材、駐車場）および予約状況の記録・共有。
- **画面構成**:
  - 一覧: `/studio`
  - 作成・編集: `/studio/edit`
  - 詳細・確認: `/studio/confirm?studioId=xxx`

### 3.7. ライブ公演管理 & 来場QR受付 (`/live`)
- **目的**: 公演情報の発信、チケット予約の受付、当日来場者の高速QRコードチェックイン。
- **特徴**:
  - **動的インポート (`jsqr`)**: 背面カメラを起動して `<canvas>` でQRコードを高速解析。軽量運用のためにスキャン開始時のみライブラリを動的ロード。
  - **二重受付防止**: スキャン成功時に即座にチェックイン処理を行い、受付完了を表示。
- **画面構成**:
  - 一覧: `/live`
  - 作成・編集: `/live/edit`
  - 詳細・確認: `/live/confirm?liveId=xxx` (公演概要、予約状況、当日QR受付スキャナー)

### 3.8. チケット予約管理 (`/ticket`)
- **目的**: ライブチケットの予約・招待・取り置きの管理および当日受付状況の追跡。
- **特徴**:
  - 予約者ごとのユニークな予約番号発行とQRコード自動生成。
  - 代表者名、同伴者名、券種別の集計。
- **画面構成**:
  - 一覧: `/ticket` (ライブ別フィルター、予約状況、チェックイン状況)

### 3.9. 掲示板機能 (`/board`)
- **目的**: バンド全体の連絡事項、パート内限定のディスカッション、資料ファイルの共有。
- **特徴**:
  - 公開範囲の制御（全体公開 / パート限定）。
  - Firebase Storage と連携した添付ファイルアップロード（画像、PDF等）。
- **画面構成**:
  - 一覧: `/board`
  - 作成・編集: `/board/edit`
  - 詳細・確認: `/board/confirm?boardId=xxx`

### 3.10. 課題・TODO管理 (WBSツリー) (`/issue`)
- **目的**: ライブ制作や日常運営に必要なタスク、課題、議事録アクションアイテムの管理。
- **特徴**:
  - **再帰的ツリー構築 (`buildTree`)**: 親タスク（`parentId`）と子タスクの階層表示。
  - 公開範囲の制御（全体 / 自パート / 指定ユーザー）。
  - コメント機能による進捗ディスカッション。
- **画面構成**:
  - 一覧: `/issue` (ステータス別・期限別ソート、ツリー表示)
  - 作成・編集: `/issue/edit`
  - 詳細・確認: `/issue/confirm?issueId=xxx` (タスク詳細、進捗更新、コメント履歴)

### 3.11. バランス会計清算システム (`/accounting`)
- **目的**: 四半期（春・夏・秋・冬）ごとのバンド会計を頭割り相殺し、メンバー間の送金・受取を完全自動化。
- **核心ロジック**:
  - 全体の立替経費支出と収入（チケット売上等）を合算し、参加メンバー数で均等割した平均負担額（`averageBurden`）を算出。
  - 各個人の拠出額（支出 - 収入）との差額から、「支払うべき金額（マイナスなら受取額）」を完全自動計算。
- **PayPay 送金 & エビデンス承認フロー**:
  - 清算担当者（サックスパート選出のManager）の PayPay ID を送金手順に自動表示。
  - **PayPay ID コピーボタン**: 支払い手順内にワンタップでクリップボードへコピーできるボタンを配置。コピー完了の視覚的フィードバックおよびフォールバック処理を完備。
  - PayPayアプリ直接起動リンク（`paypay://`）を配置。
  - メンバーは送金完了スクリーンショット（画像圧縮済み）をアップロードし、清算担当者が照合・承認。
- **画面構成**:
  - シーズン一覧: `/accounting`
  - シーズン詳細・清算確認: `/accounting/confirm?seasonId=xxx`
  - 清算マニュアルモーダル: `ManagerSettlementGuideModal`

### 3.12. 経費申請・審査機能 (`/expense-apply`, `/expense-review`)
- **目的**: メンバーが立て替えた諸経費（スタジオ代、楽譜購入費、消耗品、交通費等）および団体収入の申請と審査。
- **特徴**:
  - 領収書写真のクライアントサイド自動圧縮（Canvas API利用）。
  - 審査履歴（`expenseApplyHistories`）による承認プロセスの透明化。
- **画面構成**:
  - 申請一覧: `/expense-apply`
  - 申請作成・編集: `/expense-apply/edit`
  - 申請詳細: `/expense-apply/confirm?applyId=xxx`
  - 審査ダッシュボード: `/expense-review` (管理者専用: 未審査一覧、一括承認、却下コメント)

### 3.13. 旅費補助管理 (`/travel-subsidy`)
- **目的**: 遠方からの参加メンバーに対する交通費補助額の自動算出・管理。
- **特徴**:
  - 居住地マスタとイベント開催地マスタの組み合わせから補助金額を自動照会。
  - 移動ルート地図コンポーネント（`TravelRouteMap`）による視覚的経路確認。
- **画面構成**:
  - マスタ管理・申請確認: `/travel-subsidy`

### 3.14. LINE通知ログ・配信枠管理 (`/line-logs`, `/notice`)
- **目的**: LINE公式アカウントの月間無料配信枠（200通/月）の消費状況追跡、および送信された全メッセージ履歴の可視化。
- **特徴**:
  - **一般メンバーへの全公開**: 全ログインメンバーが配信枠の消費状況や通知履歴を自由に閲覧可能。
  - **送信数（送った回数）の直感的表示**: 残り通数だけでなく「今月の送信数（`info.consumed` / 200通）」を大きくメイン表示。
  - **メッセージサンプル内のURLクリッカブル化**: LINEトーク再現プレビュー内で、URL行やURL文字列を自動検知して外部リンクとしてタップ・遷移可能。
  - **自動通知連携（GAS）**: イベント出欠リマインド、未払い経費リマインド、TODOリマインドの定期送信ログを記録。
- **画面構成**:
  - 通知設定一覧: `/notice`
  - LINE送信履歴・配信枠状況: `/line-logs` (年月切替、グループ/個別フィルタ、種別フィルタ、検索、トーク再現モーダル)
  - 自動通知設定確認: `/notice/auto-confirm`

### 3.15. ユーザー・名簿管理 (`/user`)
- **目的**: バンドメンバー名簿の管理と個人のプロフィール設定。
- **特徴**:
  - パート別タブフィルター、略称検索。
  - 担当楽器（複数選択可）、役職、略称（譜割り用）の設定。
  - サックスパート向け PayPay ID 登録機能。
- **画面構成**:
  - 名簿一覧: `/user`
  - プロフィール詳細: `/user/confirm?userId=xxx`
  - プロフィール編集: `/user/edit`

### 3.16. AIコンシェルジュ (`/api/chat`, `ChatBot`)
- **目的**: バンドの活動ルール、スケジュール、過去の楽譜、清算状況などをメンバーが自然言語で問い合わせできるAIアシスタント。
- **セキュリティ & 技術設計**:
  - **RLS (Row Level Security) 尊重 REST API**: Firebase Admin SDK ではなく、クライアントから渡された Firebase Auth IDトークンを用いて Firestore REST API を経由。ユーザー本人に閲覧権限がある情報のみをコンテキストに注入。
  - **Groq SDK 超高速推論**: 瞬時のレスポンス生成。
  - **内部リンクのカード化**: 回答文内のマークダウンリンク（`[ラベル](/path)`）を検出し、アプリ内の `<Link>` カードとしてレンダリング。

### 3.17. 今日の一曲 (`/blue-note`) & メディア (`/media`)
- **目的**: メンバー間のおすすめジャズ音源の紹介・ディスカッション、およびライブ写真・動画ギャラリーの共有。
- **画面構成**:
  - 今日の一曲: `/blue-note`
  - メディアギャラリー: `/media`, `/media/confirm`, `/media/edit`

---

## 4. データモデル (Cloud Firestore)

Firestore のセキュリティルール（`firestore.rules`）に基づき、各コレクションへのアクセス権限が厳格に定義されている。

| コレクション名 | ドキュメントID | 主なフィールド | 読み取り権限 | 書き込み/更新権限 |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `uid` (ハッシュ化UID) | `displayName`, `pictureUrl`, `sectionId`, `roleId`, `instrumentIds`, `abbreviation`, `paypayId`, `agreedAt`, `isSystemAdmin`, 各種 `is*Admin` | 全メンバー | 本人（管理者フラグ変更不可） / `isUserAdmin` |
| `users/{uid}/private/location` | `location` | `prefectureId`, `municipalityId` | 本人のみ | 本人のみ |
| `scores` | 自動採番 | `title`, `abbreviation`, `scoreUrl`, `genres`, `referenceTrack`, `youtubeId`, `isDispTop` | 全員（公開可） | `isScoreAdmin` |
| `events` | 自動採番 | `title`, `attendanceType`, `date`, `candidateDates`, `placeName`, `prefectureId`, `municipalityId`, `setlist`, `instrumentConfig` | 全メンバー | `isEventAdmin` |
| `eventAttendanceAnswers` | `{eventId}_{uid}` | `eventId`, `uid`, `status`, `comment` | 全メンバー | 本人 / `isEventAdmin` |
| `eventAdjustAnswers` | `{eventId}_{uid}` | `eventId`, `uid`, `answers` (`{ [date]: statusId }`), `comment` | 全メンバー | 本人 / `isEventAdmin` |
| `eventRecordings` | 自動採番 | `eventId`, `uid`, `title`, `url` | 全メンバー | 本人（作成） / 本人 or `isEventAdmin`（削除） |
| `assigns` | 自動採番 | `eventId`, `songId`, `partName`, `userId`, `isRehearsal` | 全メンバー | 全メンバー（UIで担当楽器制御） |
| `lives` | 自動採番 | `title`, `date`, `open`, `start`, `venue`, `advance`, `door`, `ticketStock`, `totalReserved` | 全員（公開可） | `isLiveAdmin`（予約数は全メンバー更新可） |
| `tickets` | 自動採番 | `liveId`, `uid`, `reservationNo`, `resType`, `representativeName`, `companions`, `groups` | 全員 | 本人 / `isTicketAdmin` |
| `liveCheckIns` | 自動採番 | `liveId`, `ticketId`, `reservationNo`, `name`, `type` | 全メンバー | `isLiveAdmin` / `isTicketAdmin` |
| `calls` | 自動採番 | `title`, `acceptStartDate`, `acceptEndDate`, `items`, `isAnonymous` | 全メンバー | `isCallAdmin` |
| `callAnswers` | `{callId}_{uid}` | `uid`, `answers` (`{ [genre]: CallAnswerSong[] }`) | 全メンバー | 本人 / `isCallAdmin` |
| `votes` | 自動採番 | `name`, `type`, `bordaConfig`, `items` | 全メンバー | `isVoteAdmin` |
| `voteAnswers` | `{voteId}_{uid}` | `voteId`, `uid`, `answers` | 全メンバー | 本人 / `isVoteAdmin` |
| `studios` | 自動採番 | `name`, `address`, `tel`, `url`, `priceInfo`, `parkingInfo` | 全メンバー | `isStudioAdmin` |
| `boards` | 自動採番 | `title`, `content`, `sectionId`, `files` | 全メンバー（パート判定あり） | 本人 / `isBoardAdmin` |
| `issues` | 自動採番 | `type`, `parentId`, `title`, `assigneeId`, `date`, `status`, `scope`, `steps` | 全メンバー（公開範囲判定あり） | 本人 / `isIssueAdmin` |
| `issueComments` | 自動採番 | `issueId`, `text`, `createdBy`, `createdByName` | 全メンバー | 本人（作成） / `isIssueAdmin` |
| `expenseApplies` | 自動採番 | `uid`, `typeId`, `categoryId`, `itemId`, `name`, `amount`, `date`, `status`, `isTravel`, `eventId`, `files`, `adminComment` | 本人 / `isExpenseAdmin` | 本人（未審査時） / `isExpenseAdmin` |
| `expenseApplyHistories` | 自動採番 | `applyId`, `type`, `status`, `comment`, `actorId`, `actorName` | 本人 / `isExpenseAdmin` | 本人 / `isExpenseAdmin` |
| `accountingSeasons` | `{year}-{seasonKey}` | `year`, `seasonKey`, `memberIds`, `managerId`, `evidenceUrls`, `settledAt` | 全メンバー | `isAccountAdmin` / サックスパート |
| `incomes` | 自動採番 | `uid`, `title`, `amount`, `date`, `status` | 全メンバー | `isExpenseAdmin` / `isAccountAdmin` |
| `travelSubsidies` | 自動採番 | `departurePrefectureId`, `departureMunicipalityId`, `arrivalPrefectureId`, `arrivalMunicipalityId`, `amount` | 全メンバー | `isTravelSubsidyAdmin` |
| `lineNotificationLogs` | 自動採番 | `accountType`, `accountName`, `notificationType`, `notificationTitle`, `recipientType`, `recipientUid`, `recipientName`, `recipientLineId`, `messages`, `messageCount`, `summary`, `status`, `sentAt`, `yearMonth`, `date` | 全メンバー | GAS / Admin SDK専用 |
| `notificationHistorys` | 自動採番 | 過去のグループ通知送信ログ | 全メンバー | GAS / Admin SDK専用 |
| `notificationIndividualHistorys` | 自動採番 | 過去の個別通知送信ログ | 全メンバー | GAS / Admin SDK専用 |
| `lineMessagingIds` | `uid` | `lineUid`, `isNavi` | 本人のみ（削除） | 認証フロー（Admin SDK）専用 |
| `oauthStates` | `state` | `pwaSessionId`, `createdAt` | 禁止（サーバー専用） | サーバー専用 |
| `pwaAuthSessions` | `pwaSessionId` | `customToken`, `status`, `createdAt` | 作成後15分以内 | サーバー書き込み / 本人削除 |
| `logs` / `errorLogs` | 自動採番 | `uid`, `userName`, `action`, `dataId`, `status`, `errorDetail`, `createdAt` | `isSystemAdmin` | 全メンバー（追記のみ） |
| `accessLogs` | 自動採番 | `uid`, `userName`, `pathname`, `searchParams`, `createdAt` | `isSystemAdmin` | 全メンバー（追記のみ） |
| `archives` | 自動採番 | `originalCollection`, `originalId`, `archivedAt`, 退避データ | `isSystemAdmin` | システム専用 |

---

## 5. 運用・保守・セキュリティ設計

### 5.1. 論理アーカイブと監査ログ (`archiveAndDeleteDoc`, `logs`, `accessLogs`)
- **誤削除防止 (`archiveAndDeleteDoc`)**:
  - ドキュメント削除時は直接物理削除を行わず、`archives/{collection}_{docId}_{timestamp}` に全データを完全にコピー退避してから本番データを削除。万一の誤操作でも完全復旧が可能。
- **全自動ログ記録**:
  - 操作・エラーログ: `writeLog` により `logs` / `errorLogs` コレクションへ自動記録。
  - ページアクセスログ: `ClientLayout` の `RouteChangeListener` により、全画面の遷移時に `accessLogs` へ自動記録。

### 5.2. クライアントサイド事前画像圧縮 (`compressImage`)
- **Canvas ベースの軽量化**:
  - レシート写真や送金スクリーンショット（数MB〜数十MB）を、アップロード前に HTML5 Canvas で長辺最大1000px、JPEG品質0.7にリサイズ・圧縮。
  - アップロード時間を大幅短縮し、Firebase Storage の容量および転送コストを90%以上削減。

### 5.3. 日本標準時 (JST) 固定処理 & パフォーマンス最適化
- **タイムゾーン安全設計**:
  - クライアント端末のOS設定（海外時間等）やサーバーのUTC設定に左右されないよう、`getJSTDate`、`format`、`isInTerm`（受付期間判定）など、すべて `+09:00` オフセットを適用した JST 基準で処理。
- **不要なプリフェッチの抑制**:
  - ドロワーメニューやフッター、一覧内のリンクには `prefetch={false}` を付与。App Router のデフォルトプリフェッチによる Firestore の不要な読み取り課金・クォータ枯渇を徹底防止。
- **CSS Modules の徹底**:
  - 各機能ビューおよびコンポーネントのデザインは、すべて同階層の `*.module.css` に分離して管理。インラインスタイルの多用を禁止し、クリーンで保守性の高いスタイル構成を維持。
