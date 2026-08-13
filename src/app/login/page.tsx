// app/login/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as utils from '@/src/lib/functions';
import styles from './login.module.css';
import { db, auth } from '@/src/lib/firebase';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';

const IMAGE_MAP: Record<number, number> = {
  1: 2, 2: 6, 3: 4, 4: 5, 5: 4, 6: 2, 99: 1,
};

export default function LoginPage() {
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [pwaSessionId, setPwaSessionId] = useState<string | null>(null);
  const [pwaLoginUrl, setPwaLoginUrl] = useState<string | null>(null);
  const [isAuthCompleted, setIsAuthCompleted] = useState(false);
  const [authData, setAuthData] = useState<any>(null);
  const isRedirectingRef = useRef(false);

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

  // ログイン処理
  const handleLogin = useCallback(async (sessionIdParam?: string | null) => {
    setIsLoggingIn(true);
    const sid = sessionIdParam || pwaSessionId;

    if (isStandalone && !sessionIdParam) {
      setIsLoggingIn(false);
      return;
    }

    try {
      let fetchUrl = '/api/line/get-url';
      if (sid) {
        fetchUrl += `?pwaSessionId=${sid}`;
      }
      const res = await fetch(fetchUrl);
      const { loginUrl } = await res.json();
      window.location.href = loginUrl;
    } catch {
      await utils.showDialog('ログインURL取得失敗', true);
      setIsLoggingIn(false);
    }
  }, [isStandalone, pwaSessionId]);

  // 手動での認証確認
  const handleCheckAuthAndRedirect = useCallback(async () => {
    if (isAuthCompleted && auth.currentUser) {
      localStorage.removeItem('pwa_session_id');
      const redirectAfterLogin = "/home";
      if (!authData?.agreedAt) {
        utils.setSession("redirectAfterLogin", redirectAfterLogin);
        router.push("/agreement");
      } else {
        utils.setSession("fromLogin", "true");
        router.push(redirectAfterLogin);
      }
      return;
    }

    if (auth.currentUser) {
      setIsLoggingIn(true);
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const snap = await getDoc(userRef);
        const finalData = snap.data();
        if (finalData) {
          Object.entries(finalData).forEach(([key, value]) => {
            utils.setSession(key, value);
          });
          utils.setSession("uid", auth.currentUser.uid);
        }

        const redirectAfterLogin = "/home";
        localStorage.removeItem('pwa_session_id');
        if (!finalData?.agreedAt) {
          utils.setSession("redirectAfterLogin", redirectAfterLogin);
          router.push("/agreement");
        } else {
          utils.setSession("fromLogin", "true");
          router.push(redirectAfterLogin);
        }
      } catch (err) {
        console.error(err);
        await utils.showDialog('ログイン情報の確認に失敗しました。', true);
      } finally {
        setIsLoggingIn(false);
      }
      return;
    }

    await utils.showDialog('まだログインが完了していないか処理中です。Safari等でログイン完了後に再度このボタンを押してください。', false);
  }, [isAuthCompleted, authData, router]);

  useEffect(() => {
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

    return () => {
      clearInterval(interval);
    };
  }, [getNextImage]);

  useEffect(() => {
    // 1. セッションクリア
    utils.clearAllAppSession();
    utils.removeSession("fromLogin");

    // 3. PWA Standaloneモードの検知
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // URLパラメータから pwaSessionId を取得
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('pwaSessionId');

    let unsub: (() => void) | undefined;

    if (standalone) {
      // PWA Standaloneモードの場合
      let sessionId = localStorage.getItem('pwa_session_id');
      if (!sessionId) {
        sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'pwa-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
        localStorage.setItem('pwa_session_id', sessionId);
      }
      setPwaSessionId(sessionId);

      // LINEログインの認証URLを事前にサーバーから取得
      const fetchPwaLoginUrl = async () => {
        try {
          const res = await fetch(`/api/line/get-url?pwaSessionId=${sessionId}`);
          const { loginUrl } = await res.json();
          setPwaLoginUrl(loginUrl);
        } catch (err) {
          console.error('Failed to pre-fetch PWA login URL:', err);
        }
      };
      fetchPwaLoginUrl();

      // Firestore の監視
      unsub = onSnapshot(doc(db, 'pwaAuthSessions', sessionId), async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.status === 'completed' && data.customToken) {
            if (unsub) unsub(); // 監視解除
            setIsLoggingIn(true);
            try {
              // Firebase サインイン
              const userCredential = await signInWithCustomToken(auth, data.customToken);
              const user = userCredential.user;

              const userRef = doc(db, "users", user.uid);
              const snap = await getDoc(userRef);

              const userData = {
                displayName: data.profile?.displayName || '',
                pictureUrl: data.profile?.pictureUrl || '',
                lastLoginAt: serverTimestamp(),
                ...(snap.exists() ? {} : { createdAt: serverTimestamp() })
              };

              await setDoc(userRef, userData, { merge: true });

              const updatedSnap = await getDoc(userRef);
              const finalData = updatedSnap.data();

              if (finalData) {
                Object.entries(finalData).forEach(([key, value]) => {
                  utils.setSession(key, value);
                });
                utils.setSession("uid", user.uid);
              }

              // 同期完了データをクライアント状態に保持
              setAuthData(finalData);
              setIsAuthCompleted(true);

              // セッションドキュメントの削除
              await deleteDoc(doc(db, 'pwaAuthSessions', sessionId));
              localStorage.removeItem('pwa_session_id');

              const redirectAfterLogin = "/home";
              if (!finalData?.agreedAt) {
                utils.setSession("redirectAfterLogin", redirectAfterLogin);
                router.push("/agreement");
              } else {
                utils.setSession("fromLogin", "true");
                router.push(redirectAfterLogin);
              }
            } catch (err) {
              console.error(err);
              await utils.showDialog('ログインの同期に失敗しました。もう一度お試しください。', true);
              setIsLoggingIn(false);
            }
          }
        }
      });
    } else if (urlSessionId && !isRedirectingRef.current) {
      // 外部ブラウザで pwaSessionId が渡されて開かれた場合、自動でLINEログインへ遷移
      isRedirectingRef.current = true;
      handleLogin(urlSessionId);
    }

    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div className={styles.authContainer}>
        {showPwaGuide ? (
          <div className={styles.pwaGuideBox}>
            <p className={styles.pwaGuideText}>
              LINEログインのため外部ブラウザを起動しました。<br />
              ブラウザ側でログインを完了すると、自動的にこのアプリにログインされます。<br />
              ※自動で画面が切り替わらない場合は、ログイン完了後に下の「ホームへ進む」ボタンを押してください。
            </p>
            <button
              className={styles.pwaConfirmBtn}
              onClick={handleCheckAuthAndRedirect}
            >
              ログインを完了してホームへ進む
            </button>
            <button
              className={styles.pwaCancelBtn}
              onClick={() => setShowPwaGuide(false)}
            >
              キャンセル
            </button>
          </div>
        ) : (
          <>
            {isStandalone ? (
              pwaLoginUrl ? (
                <a
                  href={pwaLoginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.loginBtn}
                  onClick={() => {
                    setShowPwaGuide(true);
                  }}
                >
                  LINEでログイン
                </a>
              ) : (
                <button className={styles.loginBtn} disabled>
                  ログイン準備中...
                </button>
              )
            ) : (
              <button 
                className={`${styles.loginBtn} ${isLoggingIn ? styles.loggingIn : ''}`}
                onClick={() => handleLogin()}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? 'ログイン準備中...' : 'LINEでログイン'}
              </button>
            )}

            <a 
              href="https://lin.ee/Z4gtFj6" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.addFriendBtn}
            >
              公式LINEを友だち追加
            </a>
          </>
        )}
      </div>
    </div>
  );
}