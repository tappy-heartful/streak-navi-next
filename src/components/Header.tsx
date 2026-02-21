"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { auth } from "@/src/lib/firebase";
import { useAuth } from "@/src/contexts/AuthContext";
import { 
  clearAllAppSession, 
  globalLineDefaultImage, 
  isTest,
  showSpinner, 
  hideSpinner 
} from "@/src/lib/functions";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userData, loading } = useAuth(); // userDataを取得
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // メニューを表示しないページ
  if (["/login", "/callback", "/agreement", "/about"].includes(pathname)) return null;

  // 重要：Firestoreのデータ(userData)があればそれを、なければAuth(user)を、最後はデフォルトを使う
  const displayName = userData?.displayName || "ゲスト";
  const pictureUrl = userData?.pictureUrl || globalLineDefaultImage;
  const uid = user?.uid || "";

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    try {
      showSpinner();
      await auth.signOut();
      clearAllAppSession();
      router.push("/login");
    } catch (error) {
      console.error("Logout Error:", error);
      alert("ログアウトに失敗しました");
    } finally {
      hideSpinner();
      closeMenu();
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => alert("URLをコピーしました"));
    }
  };

  const menuLink = (href: string, label: string) => (
    <Link href={href} onClick={closeMenu}>
      {label}
    </Link>
  );

  return (
    <>
      <header className="site-header">
        <div className="header-left">
          <div className="logo-text" onClick={() => router.push("/home")}>
            Streak <span className="logo-n">{isTest ? "T" : "N"}</span>avi
          </div>
        </div>

        <div className="header-right" onClick={toggleMenu}>
          {/* ローディング中は画像を出さないか、仮のものを出す */}
          {!loading && (
            <img
              src={pictureUrl}
              alt="User Icon"
              className="line-icon"
              onError={(e) => { (e.target as HTMLImageElement).src = globalLineDefaultImage; }}
            />
          )}
          <div className="hamburger-menu">
            <i className="fa-solid fa-bars"></i>
          </div>
        </div>

        {isMenuOpen && <div className="menu-overlay" onClick={closeMenu}></div>}

        <div className={`slide-menu ${isMenuOpen ? "open" : ""}`}>
          <div className="menu-header">
            <img 
              src={pictureUrl} 
              className="menu-user-icon" 
              alt="user" 
              onError={(e) => { (e.target as HTMLImageElement).src = globalLineDefaultImage; }}
            />
            <div className="menu-user-info">
              <span 
                className="menu-user-name" 
                onClick={() => {
                  if (uid) {
                    router.push(`/user-confirm?uid=${uid}`);
                    closeMenu();
                  }
                }}
              >
                {displayName}
              </span>
            </div>
            <div className="close-menu" onClick={closeMenu}>
              <i className="fa-solid fa-xmark"></i>
            </div>
          </div>

          <div className="slide-menu-section">
            {menuLink("/home", " ホーム")}
            {menuLink("/score", "譜面")}
            {menuLink("/event", "イベント")}
            {menuLink("/assign", "譜割り")}
            {menuLink("/call", "曲募集")}
            {menuLink("/vote", "投票")}
            {menuLink("/collect", "集金")}
            {menuLink("/studio", "スタジオ")}
            {menuLink("/user", "ユーザ")}
            {menuLink("/notice", "通知設定")}
            {menuLink("/blue-note", "今日の一曲")}
            {menuLink("/board", "掲示板")}
            {menuLink("/live", "ライブ")}
            {menuLink("/ticket", "予約者一覧")}
            {menuLink("/media", "メディア")}
          </div>

          <div className="slide-menu-section menu-bottom">
            <a onClick={() => {
              if (uid) {
                router.push(`/user-confirm?uid=${uid}`);
                closeMenu();
              }
            }}>ユーザ情報</a>
            <a onClick={handleLogout} className="logout-text">ログアウト</a>
          </div>
        </div>
      </header>

      <div className="breadcrumb-bar">
        <div id="breadcrumb-container"></div>
        <button className="share-button" onClick={handleShare}>
          <i className="fas fa-share-alt"></i>
        </button>
      </div>
    </>
  );
}