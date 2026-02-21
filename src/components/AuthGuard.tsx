"use client";

import { useAuth } from "@/src/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ローディングが終わった状態でユーザーがいなければログインへ
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // ローディング中や未認証時は何も表示しない（またはスピナーを表示）
  if (loading || !user) {
    // lib/functions.ts の showSpinner が作る構造と同じものを返す
    return (
      <div id="spinner-overlay">
        <div className="spinner"></div>
      </div>
    );
  }

  // 認証済みなら子供の要素を表示
  return <>{children}</>;
}