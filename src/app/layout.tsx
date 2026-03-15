// app/layout.tsx
import type { Metadata } from "next";
import ClientLayout from "./ClientLayout"; // 後で作るファイル

// Metadataはサーバーコンポーネントでしか動かないのでここに置く
export const metadata: Metadata = {
  title: {
    template: "%s | Streak Navi", // %s に各ページのタイトルが入る
    default: "Streak Navi",       // タイトル未設定時のデフォルト
  },
  description: "Swing Streak Jazz Orchestraの公式ナビゲーションサイトです。",
  icons: {
    icon: "https://tappy-heartful.github.io/streak-images/navi/favicon.png",
    apple: "https://tappy-heartful.github.io/streak-images/navi/favicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Streak Navi",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#2e7d32",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
      </head>
      <body>
        {/* クライアント側のロジックを別コンポーネントとして呼び出す */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}