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

## 修正後の確認手順

コードを修正したら必ず以下の順で確認すること：

1. **ビルド確認**: `npm run build` を実行し、TypeScript エラーが0件であることを確認する
2. **動作確認**: `npm run dev` でローカル起動し、修正に関連する画面・機能を手動で操作して確認する
3. **テストシナリオ**: 修正箇所に応じた操作を行い、想定通りの挙動であることを確認する

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
