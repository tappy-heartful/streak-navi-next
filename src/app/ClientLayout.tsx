// app/ClientLayout.tsx
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

  const publicPaths = ["/login", "/callback", "/agreement", "/about"];
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.push("/login");
    }
  }, [user, loading, isPublicPath, router]);

  if (isPublicPath) return <>{children}</>;

  if (loading || !user) {
    // lib/functions.ts の showSpinner が作る構造と同じものを返す
    return (
      <div id="spinner-overlay">
        <div className="spinner"></div>
      </div>
    );
  }
  return <>{children}</>;
}

// --- メインレイアウトのロジック部分 ---
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noLayoutPaths = ["/login", "/callback", "/agreement"];
  const isNoLayout = noLayoutPaths.includes(pathname);

  return (
    <AuthProvider>
      <AuthGuard>
        {!isNoLayout && <Header />}
        {children}
        {!isNoLayout && <Footer />}
      </AuthGuard>
      <Script 
        src="https://www.instagram.com/embed.js" 
        strategy="afterInteractive" 
      />
      <CommonDialog />
    </AuthProvider>
  );
}