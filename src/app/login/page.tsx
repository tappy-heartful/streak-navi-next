// app/login/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import * as utils from '@/src/lib/functions';
import styles from './login.module.css';

const IMAGE_MAP: Record<number, number> = {
  1: 2, 2: 6, 3: 4, 4: 5, 5: 4, 6: 2, 99: 1,
};

export default function LoginPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [bgState, setBgState] = useState({
    current: { url: '', anim: '' },
    next: { url: '', anim: '' },
    showNext: false,
  });

  // 背景の切り替えロジック
  const getNextImage = useCallback((currentA?: number, currentB?: number) => {
    const keys = Object.keys(IMAGE_MAP).map(Number);
    let nextA: number;
    let nextB: number;

    if (currentA === undefined || currentB === undefined) {
      // 初回ランダム
      nextA = keys[Math.floor(Math.random() * keys.length)];
      nextB = 1;
    } else {
      nextB = currentB + 1;
      nextA = currentA;
      if (nextB > IMAGE_MAP[currentA]) {
        nextB = 1;
        const currentIndex = keys.indexOf(currentA);
        nextA = keys[(currentIndex + 1) % keys.length];
      }
    }

    const anims = [styles.zoomIn, styles.zoomOut];
    return {
      url: `https://tappy-heartful.github.io/streak-images/navi/background/${nextA}_${nextB}.jpg`,
      anim: anims[Math.floor(Math.random() * anims.length)],
      a: nextA,
      b: nextB,
    };
  }, []);

  useEffect(() => {
    // 1. セッションクリア
    utils.clearAllAppSession();

    // 2. スライドショー初期化
    const first = getNextImage();
    setBgState(prev => ({ ...prev, current: { url: first.url, anim: first.anim } }));

    let curA = first.a;
    let curB = first.b;

    const interval = setInterval(() => {
      const next = getNextImage(curA, curB);
      curA = next.a;
      curB = next.b;

      // 次の画像をセットしてフェードイン開始
      setBgState(prev => ({
        ...prev,
        next: { url: next.url, anim: next.anim },
        showNext: true
      }));

      // フェード完了後（2秒後）にメインを入れ替える
      setTimeout(() => {
        setBgState(prev => ({
          ...prev,
          current: { url: next.url, anim: next.anim },
          showNext: false
        }));
      }, 2000);

    }, 10000); // 10秒おき

    return () => clearInterval(interval);
  }, [getNextImage]);

  // ログイン処理
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${utils.globalAuthServerRender}/get-line-login-url`);
      const { loginUrl } = await res.json();
      window.location.href = loginUrl;
    } catch (err: any) {
      alert('ログインURL取得失敗: ' + err.message);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      {/* 背景レイヤー 1 (現在) */}
      <div 
        className={`${styles.bgLayer} ${bgState.current.anim}`}
        style={{ backgroundImage: `url(${bgState.current.url})`, opacity: bgState.showNext ? 0 : 1 }}
      />
      {/* 背景レイヤー 2 (次) */}
      <div 
        className={`${styles.bgLayer} ${bgState.next.anim}`}
        style={{ backgroundImage: `url(${bgState.next.url})`, opacity: bgState.showNext ? 1 : 0 }}
      />
      
      <div className={styles.bgCover} />

      <div className={styles.title}>
        <h1>
          Streak <span style={{ color: 'rgb(208, 2, 2)' }}>N</span>avi
        </h1>
      </div>

      <button 
        className={`${styles.loginBtn} ${isLoggingIn ? styles.loggingIn : ''}`}
        onClick={handleLogin}
        disabled={isLoggingIn}
      >
        {isLoggingIn ? 'ログイン準備中...' : 'LINEでログイン'}
      </button>
    </div>
  );
}