"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AuthProvider, useAuth } from "@/src/contexts/AuthContext";
import { BreadcrumbProvider } from "@/src/contexts/BreadcrumbContext";
import { useEffect, useTransition, Suspense } from "react"; // useTransitionを追加
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import CommonDialog from "@/src/components/CommonDialog";
import CommonModal from "@/src/components/CommonModal";
import { ChatBot } from "@/src/components/Chat/ChatBot";

// --- 共通スピナーコンポーネント ---
const LoadingSpinner = () => (
  <div id="spinner-overlay">
    <div className="spinner"></div>
  </div>
);

// --- 認証ガード用コンポーネント ---
function AuthGuard({ children, isPending }: { children: React.ReactNode, isPending: boolean }) {
  const { user, loading, userData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const publicPaths = ["/login", "/callback", "/agreement", "/about"];
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return;

      if (!user) {
        if (!isPublicPath) {
          router.push("/login");
        }
        return;
      }

      // ログイン済みの場合、利用規約同意チェック (PublicPath以外の時)
      if (!isPublicPath) {
        // 1. 利用規約同意チェック
        if (userData && !userData.agreedAt) {
          const { showDialog } = await import("@/src/lib/functions");
          await showDialog("ログイン後、利用規約に同意してください", true);
          router.push("/login");
          return;
        }

        // 2. 必須プロフィール項目チェック (プロフィール編集画面以外の場合)
        if (userData && pathname !== "/user/edit") {
          const isIncomplete =
            !userData.sectionId ||
            !userData.roleId ||
            !userData.abbreviation ||
            !userData.instrumentIds || userData.instrumentIds.length === 0 ||
            (userData.sectionId === "1" && !userData.paypayId); // サックスパート(1)の場合はPayPay ID必須

          if (isIncomplete) {
            const { showDialog } = await import("@/src/lib/functions");
            await showDialog("不足しているユーザ情報を登録してください", true);
            router.push(`/user/edit?uid=${user.uid}`);
          }
        }
      }
    };

    checkAuth();
  }, [user, loading, userData, isPublicPath, router, pathname]);

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
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const noLayoutPaths = ["/login", "/callback", "/agreement"];
    const isNoLayout = noLayoutPaths.includes(pathname);

    if (isNoLayout) {
      document.body.classList.remove("with-fixed-header");
    } else {
      document.body.classList.add("with-fixed-header");
    }
  }, [pathname]);

  useEffect(() => {
    // 1. ページ遷移（URLパスの変更）ごとにデータを強制的に最新化する (Router Cache対策)
    router.refresh();

    // 2. iOS Safari等のBFCache（戻るボタンでの遷移）対策
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        router.refresh();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [pathname, router]);

  useEffect(() => {
    // 内部リンク（<a>タグ）クリック時にスピナーを表示する
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');

      // hrefがURLスキーム（例えばhttp://やmailto:）を持たず、別タブでないなら 내부リンクとみなす
      if (href && href.startsWith('/') && targetAttr !== '_blank' && !e.ctrlKey && !e.metaKey) {
        // 現在のURL（パス + クエリ）と同じならスピナーを出さない
        const currentPath = window.location.pathname + window.location.search;
        if (href === currentPath || href === window.location.pathname) {
          return;
        }
        import("@/src/lib/functions").then((mod) => mod.showSpinner());
      }
    };

    document.addEventListener('click', handleAnchorClick);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SW registered: ', registration);
          },
          (registrationError) => {
            console.log('SW registration failed: ', registrationError);
          }
        );
      });
    }

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
        <CommonDialog />
        <CommonModal />
        {!isNoLayout && <ChatBot />}
      </BreadcrumbProvider>
    </AuthProvider>
  );
}