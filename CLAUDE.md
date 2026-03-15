# streak-navi プロジェクト規約

## リファクタリング方針（バニラ → Next.js）

### 基本方針

- バニラ版の**既存のデザインと機能をすべて踏襲**すること。画面構成・表示項目・操作フロー・ロジックを維持した上で、Next.js/TypeScript の実装パターンに置き換える
- 機能の追加・削除・変更はしない。バニラ版で動いていたものはそのまま動くようにする

### Firestoreフィールドの扱い

- バニラ版のFirestoreコレクションに存在する `_decoded` サフィックスのフィールドは、Next.js版では**使用しない・型定義にも含めない**
  - 例: `sectionId_decoded`, `roleId_decoded` などは除去する
  - Next.js版では必要に応じてデコード済みの値を別途取得する

---

## Next.js App Router 開発の重要ポイント

### サーバーコンポーネント vs クライアントコンポーネント

- App Router では**デフォルトがサーバーコンポーネント**。`"use client"` は本当に必要な場合のみ付ける
- クライアントコンポーネントが必要なケース：`useState` / `useEffect` / イベントハンドラ / ブラウザAPI
- サーバーコンポーネントでは `useState` / `useEffect` / `useContext` は使えない（ビルドエラーになる）
- `"use client"` を付けたファイルからは `import 'server-only'` なモジュールをインポートしてはいけない

### データ取得

- サーバーコンポーネントでは `async/await` でそのままデータ取得できる
- 複数データの並列取得は `Promise.all` を使う（直列は避ける）
- `generateMetadata` でデータ取得した場合、ページコンポーネントで**再取得**になる（Admin SDKはキャッシュされない）。データ量が多い場合は注意

### searchParams / params の扱い（App Router の重要な変更点）

- App Router では `searchParams` と `params` は **Promise** として渡される — 必ず `await` する
  ```typescript
  // ✅ 正しい
  const { studioId } = await searchParams;
  // ❌ 誤り（型エラー、または undefined になる）
  const { studioId } = searchParams;
  ```
- `generateMetadata` と `page` コンポーネントの両方で `searchParams` を受け取る場合、それぞれで `await` が必要

### ナビゲーション

- **内部リンクは必ず `<Link>` を使う**（`next/link`）— クライアントサイドルーティングになる
- 外部リンク（別ドメイン）は通常の `<a target="_blank" rel="noopener noreferrer">` を使う
- プログラム的な遷移は `useRouter()` の `router.push()` を使う（クライアントコンポーネント内のみ）
- `notFound()` / `redirect()` は `next/navigation` からインポートする

### 静的・動的レンダリング

- `searchParams` を使うページは自動的に動的レンダリング（`ƒ`）になる
- `searchParams` を使わないページは静的生成（`○`）になりビルド時に生成される
- `export const dynamic = 'force-dynamic'` で強制的に動的にできるが、通常は不要

### 環境変数

- クライアント側で使う変数は必ず **`NEXT_PUBLIC_` プレフィックス**をつける
- プレフィックスなしの変数はサーバー側のみで参照可能（ブラウザには公開されない）
- `.env.local` は git 管理しない

### メタデータ

- 静的タイトルは `export const metadata: Metadata = { title: "..." }` で定義
- 動的タイトル（IDからデータ取得して生成）は `generateMetadata` を使う

### Firestoreオブジェクトのシリアライズ（重要）

- サーバーコンポーネントからクライアントコンポーネントへのProps受け渡し時、**Firestoreの `Timestamp` オブジェクトはそのまま渡せない**（`Classes or null prototypes are not supported` エラー）
- サーバー側で必ず `toMillis()` で数値に変換する
  ```typescript
  // ❌ そのまま渡すとエラー
  createdAt: doc.data().createdAt  // Timestampオブジェクト
  // ✅ 正しい
  createdAt: doc.data().createdAt?.toMillis?.() ?? 0
  ```
- `...doc.data()` のスプレッドにも注意。Timestampフィールドが混入する。必要なフィールドのみ明示的に取り出す
- サーバーコンポーネントから渡せる型：プリミティブ（string, number, boolean）、plain object、配列、null/undefined

### データ更新後のUI反映

- Firestoreの書き込み後に**同じページの表示を最新化**したい場合は `router.refresh()` を使う
  - `router.refresh()` → サーバーコンポーネントのデータ再取得（Firestore再読み込み）が走る
  - `router.push(path)` → 別ページへ遷移（現ページのデータは再取得しない）
  ```typescript
  // ✅ 回答を削除 → 同じページを最新データで再表示
  await deleteMyAnswer(eventId, uid);
  router.refresh();
  // ✅ イベントを登録 → 一覧に遷移
  await addEvent(data);
  router.push("/event");
  ```

### "use client" 境界の最小化

- `"use client"` はコンポーネントツリーの**できるだけ末端（葉）** に付ける
- 親コンポーネントに `"use client"` を付けると、その子コンポーネントもすべてクライアント側になる
- インタラクティブな部分だけをクライアントコンポーネントに切り出し、残りをサーバーコンポーネントのままにするのが理想
  ```
  ✅ 推奨
  Page (server) → StaticSection (server) + InteractiveButton (client)
  ❌ 避ける
  Page (client) → StaticSection (client) + InteractiveButton (client)
  ```

### Hydrationエラーの回避

- サーバーとクライアントでレンダリング結果が異なるとHydrationエラーが発生する
- やりがちなNG例：
  - `Date.now()` や `new Date()` をJSX内で直接使う（サーバーとクライアントで時刻がズレる）
  - `typeof window !== "undefined"` の条件分岐でレンダリングを変える
  - ブラウザ依存のAPIを初期レンダリングで参照する
- 対策：`useEffect` 内でのみブラウザAPIを参照する

### ファイルベースの特殊ファイル

- `loading.tsx` — ページのデータ取得中に自動表示されるローディングUI（Suspenseの代替）
- `error.tsx` — ページでエラーが発生した際のフォールバックUI（`"use client"` が必要）
- `not-found.tsx` — `notFound()` を呼んだときのカスタム404UI
- これらはページのコロケーション（同じディレクトリに配置）を推奨

### 画像の最適化

- 画像は `<img>` ではなく `next/image` の `<Image>` を使う（自動的にWebP変換・遅延読み込み・サイズ最適化）
  ```typescript
  import Image from "next/image";
  // width / height または fill が必須
  <Image src={url} alt="説明" width={60} height={60} />
  ```
- ただし外部URL（LINEプロフィール画像など）は `next.config.js` の `images.domains` への登録が必要。未登録の場合は通常の `<img>` でもよい

---

## 修正後の確認手順

コードを修正したら必ず以下の順で確認すること：

1. **ビルド確認**: `npm run build` を実行し、TypeScript エラーが0件であることを確認する
2. **動作確認**: `npm run dev` でローカル起動し、修正に関連する画面・機能を手動で操作して確認する
3. **テストシナリオ**: 修正箇所に応じた操作を行い、想定通りの挙動であることを確認する

動作確認やテストはlocalhost:3000や3001でやって？LINEログインできないから
localhostを立ち上げるとoriginのパスではログイン画面が表示される。
ページ下部のLINEでログインボタンを押し、
tappynanakoro@gmail.comとパスワード：Kodakku216を入力して？
動作確認時、既存のデータは編集、削除しないで
動作確認は、新規機能作成時は新規作成、編集、コピー、削除までやって、データ状態はテスト前になるようにして。その他デザインの修正時など軽微な修正の際は確認不要。
(編集画面にて、日付入力欄を直接入力しようとするとなんかうまく操作できてないみたいだから、そこは注意して。年、月、日それぞれで入力するとかしてね)
(回答機能がある場合、受付期間は、新規登録時は明日以降しかだめだけど、更新時は今日を期間に入れるのokだから、回答のテストは、更新で受付期間を調整したあと行うといいよ)

スマホでの操作が一番多いからスマホサイズでのデザインの確認も忘れないでね

なお、既存のバニラのサイトは以下。デザインや挙動は以下を参考にして
https://streak-navi.web.app/app/home/home.html

---

## コードレビューチェックリスト

機能を追加・修正する際に確認すべき項目。実装後はこのリストに従ってセルフレビューを行うこと。

### 🔐 セキュリティ・権限

- Firestoreに書き込むデータに「管理者フラグ」が含まれていないか
- `updateDoc` で送るフィールドは画面で編集したフィールドのみか（余計なフィールドを含めていないか）
- `isAdmin` / `overrideAdmin` の権限チェックが抜けていないか（`EditFormLayout` / `ConfirmLayout` 使用で自動担保）
- `dangerouslySetInnerHTML` を使う場合、XSSリスクが軽減されているか（YouTube埋め込みなど信頼済みソースのみ）

### 🏗️ アーキテクチャ

- **サーバー/クライアント分離**: Firestoreの読み込みはサーバーコンポーネント（`*-server-actions.ts`）で行っているか
- **クライアント書き込み**: 更新処理はクライアントサービス（`*-client-service.ts`）で行っているか
- `"use client"` / `import 'server-only'` が適切についているか
- 新機能は `src/features/<feature>/` 配下に配置しているか（`api/`, `lib/`, `components/`, `views/`）

### 📝 TypeScript 型

- `any` 型を使っていないか（特に Props、API戻り値、Firestoreデータ）
- Firestoreコレクションの型は `src/lib/firestore/types.ts` に定義されているか
- `_decoded` サフィックスのフィールドを型定義・使用していないか（上記「リファクタリング方針」参照）
- `as unknown as SomeType` のような型アサーションで型チェックを回避していないか

### 🎨 UI/UX 一貫性

- エラー表示は `alert()` ではなく `showDialog()` を使っているか（`src/lib/functions.ts` からインポート）
- ローディングはスピナー（`showSpinner` / `hideSpinner`）を使っているか
- フォームは `useAppForm` hook + `EditFormLayout` を使っているか
- 詳細表示は `ConfirmLayout` を使っているか
- 一覧（検索あり）は `SearchableListLayout`、一覧（シンプル）は `ListBaseLayout` を使っているか
- パンくずは各ページの `useEffect` 内で `setBreadcrumbs` を呼んでいるか

### 🔗 ルーティング・URL

- 新規作成URLは `?mode=new`（`?isInit=true` は廃止）
- 編集URLは `?mode=edit&<featureIdKey>=<id>`
- コピーURLは `?mode=copy&<featureIdKey>=<id>`
- 詳細URLは `confirm?<featureIdKey>=<id>`

### 📋 バリデーション

- 必須項目のバリデーションは `useAppForm` の第2引数に定義されているか
- バリデーション関数は `(v) => true | "エラーメッセージ"` 形式か
