"use client"; // usePathnameを使うために追加

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/src/contexts/AuthContext";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Script from "next/script";
import CommonDialog from "@/src/components/CommonDialog";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // ヘッダー・フッターを非表示にしたいパスのリスト
  const noLayoutPaths = ["/login", "/callback", "/agreement"];
  
  // 現在のパスがリストに含まれているかチェック
  const isNoLayout = noLayoutPaths.includes(pathname);

  return (
    <html lang="ja">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
      </head>
      <body>
        <AuthProvider>
          {/* ログイン画面などの時は非表示にする */}
          {!isNoLayout && <Header />}
          
          {children}
          
          {!isNoLayout && <Footer />}
          
          <Script 
            src="https://www.instagram.com/embed.js" 
            strategy="afterInteractive" 
          />
          <CommonDialog />
        </AuthProvider>
      </body>
    </html>
  );
}