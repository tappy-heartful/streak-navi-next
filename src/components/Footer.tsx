"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSession, removeSession, globalLineDefaultImage } from "@/src/lib/functions";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (["/login", "/callback", "/agreement", "/about"].includes(pathname)) return null;

  const [showOverlay, setShowOverlay] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [userData, setUserData] = useState({ name: "", icon: "" });

  useEffect(() => {
    const fromLogin = getSession("fromLogin");

    if (fromLogin === "true") {
      // 1. データをセット
      setUserData({
        name: getSession("displayName") || "ゲスト",
        icon: getSession("pictureUrl") || globalLineDefaultImage,
      });

      // 2. DOMに出現させる
      setShowOverlay(true);
      
      // 3. セッションを消す（二重表示防止）
      removeSession("fromLogin");

      // 4. アニメーション開始 (少し遅らせて transition を効かせる)
      const showTimer = setTimeout(() => setIsAnimating(true), 100);

      // 5. 3秒間表示して、その後フェードアウト開始
      const hideTimer = setTimeout(() => {
        setIsAnimating(false);
        // フェードアウト(0.5s)が終わってからDOMから消す
        setTimeout(() => setShowOverlay(false), 500);
      }, 3500);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [pathname]); // パスが変わったタイミングでもチェックするようにする

  // 手動で閉じたい場合の関数
  const manualClose = () => {
    setIsAnimating(false);
    setTimeout(() => setShowOverlay(false), 500);
  };

  return (
    <>
      <footer>
        <div>&copy; 2025, 2026 Swing Streak Jazz Orchestra</div>
        <div className="developed-by">Developed by Takumi Fujimoto</div>
        <div className="footer-actions">
          <Link href="/about" target="_blank">サイト情報</Link>
        </div>
      </footer>

      {showOverlay && (
        <div 
          className={`first-login-overlay ${isAnimating ? "show" : ""}`}
          onClick={manualClose}
        >
          <div className="first-login-content">
            <img className="line-icon" src={userData.icon} alt="LINE" />
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