"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { auth } from "@/src/lib/firebase";
import { showSpinner, hideSpinner, showDialog, clearAllAppSession } from "@/src/lib/functions";
import styles from "./not-found.module.css";

export default function NotFound() {
  const router = useRouter();
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  React.useEffect(() => {
    setBreadcrumbs([{ title: "404 Not Found" }]);
  }, [setBreadcrumbs]);

  const handleLogout = async () => {
    if (!user) {
      showSpinner();
      router.replace("/login");
      return;
    }

    const confirmed = await showDialog("ログアウトしてログイン画面に戻りますか？");
    if (!confirmed) return;

    try {
      showSpinner();
      await auth.signOut();
      clearAllAppSession();
      router.replace("/login");
    } catch (error) {
      console.error("[NotFound] ログアウトエラー:", error);
      await showDialog("ログアウトに失敗しました", true);
    } finally {
      hideSpinner();
    }
  };

  return (
    <BaseLayout>
      <div className={styles.notFoundWrapper}>
        <div className={styles.card}>
          <div className={styles.iconBadge}>
            <i className="fa-solid fa-compass" />
          </div>

          <div className={styles.codeText}>404</div>
          <h1 className={styles.title}>ページが見つかりません</h1>
          <p className={styles.description}>
            アクセスしようとしたページは削除されたか、URLが変更された可能性があります。
          </p>

          <div className={styles.actionGroup}>
            <Link
              href="/home"
              prefetch={false}
              className={styles.homeBtn}
              onClick={() => showSpinner()}
            >
              <i className="fa-solid fa-house" />
              <span>ホームに戻る</span>
            </Link>

            <button
              type="button"
              className={styles.logoutBtn}
              onClick={handleLogout}
            >
              <i className="fa-solid fa-right-from-bracket" />
              <span>{user ? "ログアウトする" : "ログイン画面へ"}</span>
            </button>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
}
