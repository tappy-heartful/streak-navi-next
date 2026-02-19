"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSession, removeSession, globalLineDefaultImage } from "@/src/lib/functions";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (["/login", "/login/callback", "/agreement"].includes(pathname)) return null;
  const [showOverlay, setShowOverlay] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [userData, setUserData] = useState({
    name: "",
    icon: ""
  });

  useEffect(() => {
    // ログイン成功時にCallbackページでセットした "fromLogin" フラグを確認
    const fromLogin = getSession("fromLogin");

    if (fromLogin === "true") {
      const name = getSession("displayName") || "ゲスト";
      const icon = getSession("pictureUrl") || globalLineDefaultImage;
      
      setUserData({ name, icon });
      setShowOverlay(true);
      
      // クラスベースのアニメーション（opacity 1）を開始
      setTimeout(() => setIsAnimating(true), 100);

      // 3秒後に自動で閉じる
      const timer = setTimeout(() => {
        handleCloseOverlay();
      }, 3000);

      // 一度表示したらフラグを消す
      removeSession("fromLogin");

      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseOverlay = () => {
    setIsAnimating(false);
    setTimeout(() => setShowOverlay(false), 500); // Transition時間待ってから消去
  };

  return (
    <>
      <footer>
        <div>&copy; 2025, 2026 Swing Streak Jazz Orchestra</div>
        <div className="developed-by">Developed by Takumi Fujimoto</div>
        <div className="footer-actions">
          {/* 外部サイトや静的ファイルの場合は target="_blank" */}
          <Link href="/about" target="_blank">サイト情報</Link>
        </div>
      </footer>

      {/* 初回ログインオーバーレイ */}
      {showOverlay && (
        <div 
          className={`first-login-overlay ${isAnimating ? "show" : ""}`}
          onClick={handleCloseOverlay}
        >
          <div className="first-login-content">
            <img 
              className="line-icon" 
              src={userData.icon} 
              alt="LINEアイコン" 
            />
            <p className="welcome-message">
              ようこそ！<br />
              <span>{userData.name}</span>さん
            </p>
          </div>
        </div>
      )}
    </>
  );
}