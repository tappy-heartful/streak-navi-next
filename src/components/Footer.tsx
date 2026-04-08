"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSession, removeSession, globalLineDefaultImage } from "@/src/lib/functions";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";

export default function Footer() {
  const pathname = usePathname();
  const { userData } = useAuth(); // AuthContextから取得

  // メニューを表示しないページ
  if (["/login", "/callback", "/agreement", "/about"].includes(pathname)) return null;

  const [showOverlay, setShowOverlay] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 表示用のデータ（Contextから優先的に取得）
  const displayName = userData?.displayName || "ゲスト";
  const pictureUrl = userData?.pictureUrl || globalLineDefaultImage;

  useEffect(() => {
    const fromLogin = getSession("fromLogin");

    if (fromLogin === "true") {
      // 1. DOMに出現させる
      setShowOverlay(true);
      
      // 2. セッションを消す（二重表示防止）
      removeSession("fromLogin");

      // 3. アニメーション開始
      const showTimer = setTimeout(() => setIsAnimating(true), 100);

      // 4. 1.5秒間表示して、その後フェードアウト開始
      const hideTimer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => setShowOverlay(false), 500);
      }, 1500);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [pathname]);

  const manualClose = () => {
    setIsAnimating(false);
    setTimeout(() => setShowOverlay(false), 500);
  };

  return (
    <>
      <footer>
        <div>&copy; 2025, 2026 Swing Streak Jazz Orchestra</div>
        <div className="developed-by">Developed by Takumi Fujimoto</div>
        <button
          onClick={() => window.dispatchEvent(new Event("openChat"))}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            maxWidth: "320px",
            margin: "12px auto 4px",
            padding: "12px 20px",
            background: "linear-gradient(135deg, #4CAF50 0%, #66bb6a 100%)",
            border: "none",
            borderRadius: "24px",
            color: "#fff",
            fontSize: "0.9rem",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(76,175,80,0.35)",
          }}
        >
          <i className="fa-solid fa-robot" />
          AIコンシェルジュに聞く
        </button>
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
            <img className="line-icon" src={pictureUrl} alt="User Icon" />
            <p className="welcome-message">
              ようこそ！<br />
              <span>{displayName}</span>さん
            </p>
          </div>
        </div>
      )}
    </>
  );
}