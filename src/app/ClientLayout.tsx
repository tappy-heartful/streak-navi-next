"use client";

import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/src/contexts/AuthContext";
import { BreadcrumbProvider } from "@/src/contexts/BreadcrumbContext";
import { useEffect, useTransition } from "react"; // useTransitionを追加
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Script from "next/script";
import CommonDialog from "@/src/components/CommonDialog";
import CommonModal from "@/src/components/CommonModal";

// --- 共通スピナーコンポーネント ---
const LoadingSpinner = () => (
  <div id="spinner-overlay">
    <div className="spinner"></div>
  </div>
);

// --- 認証ガード用コンポーネント ---
function AuthGuard({ children, isPending }: { children: React.ReactNode, isPending: boolean }) {
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

  // 1. 認証チェック中のスピナー
  if (!isPublicPath && (loading || !user)) {
    return <LoadingSpinner />;
  }

  return (
    <>
      {/* 2. ページ遷移中(Pending)のスピナーをオーバーレイ表示 */}
      {isPending && <LoadingSpinner />}
      {children}
    </>
  );
}

// --- メインレイアウト ---
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // transition状態を管理
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Next.jsのrouter.pushをラップしてtransitionを開始する仕組みは
  // Linkコンポーネントには自動で適用されませんが、
  // Page遷移時のデータ読み込み(Server Componentの処理)が発生すると
  // Reactが自動的にisPendingを更新してくれます。

  const noLayoutPaths = ["/login", "/callback", "/agreement"];
  const isNoLayout = noLayoutPaths.includes(pathname);

  return (
    <AuthProvider>
      <BreadcrumbProvider>
        <AuthGuard isPending={isPending}>
          {!isNoLayout && <Header />}
          {children}
          {!isNoLayout && <Footer />}
        </AuthGuard>
        
        <Script 
          src="https://www.instagram.com/embed.js" 
          strategy="afterInteractive" 
        />
        <CommonDialog />
        <CommonModal />
      </BreadcrumbProvider>
    </AuthProvider>
  );
}