"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  getSession, 
  clearAllAppSession, 
  globalLineDefaultImage, 
  isTest 
} from "@/src/lib/functions";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  
  // メニューを表示しないページ
  if (["/login", "/callback", "/agreement"].includes(pathname)) return null;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userData, setUserData] = useState({
    displayName: "",
    // 初期値を空文字ではなく null にするか、デフォルト画像にする
    pictureUrl: null as string | null, 
    uid: ""
  });

  // セッション情報の取得
  useEffect(() => {
    setUserData({
      displayName: getSession("displayName") || "ゲスト",
      pictureUrl: getSession("pictureUrl") || globalLineDefaultImage,
      uid: getSession("uid") || ""
    });
  }, [pathname]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    clearAllAppSession();
    router.push("/login");
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert("URLをコピーしました");
      });
    }
  };

  const menuLink = (href: string, label: string, icon?: string) => (
    <Link href={href} onClick={closeMenu}>
      {icon && <i className={icon}></i>} {label}
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
          {/* 修正ポイント：画像URLがあるときだけ img を描画する */}
          {userData.pictureUrl && (
            <img
              src={userData.pictureUrl}
              alt="LINE"
              className="line-icon"
            />
          )}
          <div className="hamburger-menu">
            <i className="fa-solid fa-bars"></i>
          </div>
        </div>

        {isMenuOpen && (
          <div className="menu-overlay" onClick={closeMenu}></div>
        )}

        <div className={`slide-menu ${isMenuOpen ? "open" : ""}`}>
          <div className="menu-header">
            {/* 修正ポイント：ここも同様 */}
            {userData.pictureUrl && (
              <img src={userData.pictureUrl} className="menu-user-icon" alt="user" />
            )}
            <div 
              className="menu-user-name" 
              onClick={() => {
                router.push(`/user-confirm?uid=${userData.uid}`);
                closeMenu();
              }}
            >
              {userData.displayName}
            </div>
            <div className="close-menu" onClick={closeMenu}>
              <i className="fa-solid fa-xmark"></i>
            </div>
          </div>

          <div className="slide-menu-section">
            {menuLink("/home", " ホーム", "fa fa-home")}
            {menuLink("/score-list", "譜面")}
            {menuLink("/event-list", "イベント")}
            {menuLink("/assign-list", "譜割り")}
            {menuLink("/call-list", "曲募集")}
            {menuLink("/vote-list", "投票")}
            {menuLink("/collect-list", "集金")}
            {menuLink("/studio-list", "スタジオ")}
            {menuLink("/user-list", "ユーザ")}
            {menuLink("/notice-list", "通知設定")}
            {menuLink("/blue-note-edit", "今日の一曲")}
            {menuLink("/board-list", "掲示板")}
            {menuLink("/live-list", "ライブ")}
            {menuLink("/ticket-list", "予約者一覧")}
            {menuLink("/media-list", "メディア")}
          </div>

          <div className="slide-menu-section menu-bottom">
            <a onClick={() => {
              router.push(`/user-confirm?uid=${userData.uid}`);
              closeMenu();
            }}>ユーザ情報</a>
            <a onClick={handleLogout} className="logout-text">ログアウト</a>
          </div>
        </div>
      </header>

      <div className="breadcrumb-bar">
        <div id="breadcrumb-container">
          {/* コンポーネント化を検討してもいいですね */}
        </div>
        <button className="share-button" onClick={handleShare}>
          <i className="fas fa-share-alt"></i>
        </button>
      </div>
    </>
  );
}