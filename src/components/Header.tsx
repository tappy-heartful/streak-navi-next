"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { auth } from "@/src/lib/firebase"; // Firebase Authをインポート
import { 
  getSession, 
  clearAllAppSession, 
  globalLineDefaultImage, 
  isTest,
  showSpinner, // 演出用にスピナー関数があれば追加
  hideSpinner 
} from "@/src/lib/functions";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  
  // メニューを表示しないページ
  if (["/login", "/callback", "/agreement", "/about"].includes(pathname)) return null;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userData, setUserData] = useState({
    displayName: "",
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

  // ログアウト処理の修正
  const handleLogout = async () => {
    try {
      showSpinner(); // 処理中スピナー表示

      // 1. Firebaseのサインアウト
      await auth.signOut();

      // 2. ブラウザのセッションストレージ等をクリア
      clearAllAppSession();

      // 3. ログイン画面へリダイレクト
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
            <a 
              className="menu-user-name" 
              onClick={() => {
                router.push(`/user-confirm?uid=${userData.uid}`);
                closeMenu();
              }}
            >
              {userData.displayName}
            </a>
            <div className="close-menu" onClick={closeMenu}>
              <i className="fa-solid fa-xmark"></i>
            </div>
          </div>

          <div className="slide-menu-section">
            {menuLink("/home", " ホーム", "fa fa-home")}
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