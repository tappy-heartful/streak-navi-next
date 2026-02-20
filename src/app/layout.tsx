"use client";

import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/src/contexts/AuthContext";
import { useEffect } from "react";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Script from "next/script";
import CommonDialog from "@/src/components/CommonDialog";

// --- 認証ガード用コンポーネント ---
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // 認証から除外するパスのリスト
  const publicPaths = ["/login", "/callback", "/agreement", "/about"];
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    // ローディングが完了し、ユーザーが未ログインで、かつ公開ページでない場合はログインへ
    if (!loading && !user && !isPublicPath) {
      router.push("/login");
    }
  }, [user, loading, isPublicPath, router]);

  // 公開ページならそのまま表示
  if (isPublicPath) {
    return <>{children}</>;
  }

  // 認証チェック中または未ログイン時はコンテンツを隠す（スピナー等を表示しても良い）
  if (loading || !user) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        backgroundColor: "#000",
        color: "#fff" 
      }}>
        Loading...
      </div>
    );
  }

  // 認証済みなら表示
  return <>{children}</>;
}

// --- メインレイアウト ---
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // ヘッダー・フッターを非表示にしたいパス（基本は認証除外パスと同じことが多い）
  const noLayoutPaths = ["/login", "/callback", "/agreement"];
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
          <AuthGuard>
            {/* レイアウト（ヘッダー）の表示判定 */}
            {!isNoLayout && <Header />}
            
            {children}
            
            {/* レイアウト（フッター）の表示判定 */}
            {!isNoLayout && <Footer />}
          </AuthGuard>
          
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