"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AuthProvider, useAuth } from "@/src/contexts/AuthContext";
import { BreadcrumbProvider } from "@/src/contexts/BreadcrumbContext";
import { useEffect, useTransition, Suspense } from "react"; // useTransitionを追加
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

function RouteChangeListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    import("@/src/lib/functions").then((mod) => mod.hideSpinner());
  }, [pathname, searchParams]);

  return null;
}

// --- メインレイアウト ---
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // 内部リンク（<a>タグ）クリック時にスピナーを表示する
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      
      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');
      
      // hrefがURLスキーム（例えばhttp://やmailto:）を持たず、別タブでないなら 내부リンクとみなす
      if (href && href.startsWith('/') && targetAttr !== '_blank' && !e.ctrlKey && !e.metaKey) {
        import("@/src/lib/functions").then((mod) => mod.showSpinner());
      }
    };
    
    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

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
        
        <Suspense fallback={null}>
          <RouteChangeListener />
        </Suspense>
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