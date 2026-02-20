"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/src/lib/firebase";
import { signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { showSpinner, hideSpinner, setSession } from "@/src/lib/functions";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasCalled = useRef(false); // 二重実行防止フラグ

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      alert("LINEログインをキャンセルしました");
      router.push("/login");
      return;
    }

    if (code && state && !hasCalled.current) {
      hasCalled.current = true; // 実行済みマーク
      handleLogin(code, state);
    }
  }, [searchParams, router]);

  async function handleLogin(code: string, state: string) {
    try {
    showSpinner();
    const redirectUri = window.location.origin + window.location.pathname;

    // 自身のサーバーの API を叩く
    const res = await fetch('/api/line/login', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state, redirectUri }),
    });
    const data = await res.json();

      if (data.error) throw new Error(data.error);

      // 2. Firebaseログイン
      const userCredential = await signInWithCustomToken(auth, data.customToken);
      const user = userCredential.user;

      // 3. Firestoreデータ更新
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      
      const userData = {
        displayName: data.profile.displayName,
        pictureUrl: data.profile.pictureUrl,
        lastLoginAt: serverTimestamp(),
        ...(snap.exists() ? {} : { createdAt: serverTimestamp() })
      };
      
      await setDoc(userRef, userData, { merge: true });

      // 最新データをセッションに同期
      const updatedSnap = await getDoc(userRef);
      const finalData = updatedSnap.data();

      if (finalData) {
        // 全フィールドをセッションに格納（バニラ時代のロジックを継承）
        Object.entries(finalData).forEach(([key, value]) => {
          // FirebaseのTimestamp型などを考慮して保存
          setSession(key, value);
        });
        setSession("uid", user.uid);
      }

      const redirectAfterLogin = data.redirectAfterLogin || "/home";
      
      // 4. 規約同意チェック & リダイレクト
      if (!finalData?.agreedAt) {
        // 同意ページへ行く前に、本来行きたかった場所を覚えておく
        setSession("redirectAfterLogin", redirectAfterLogin);
        router.push("/agreement"); 
      } else {
        // ログイン成功フラグ（演出用）
        setSession("fromLogin", "true");
        router.push(redirectAfterLogin);
      }
    } catch (e: any) {
      console.error(e);
      alert("ログインに失敗しました: " + e.message);
      router.push("/login"); // 失敗時はログインへ戻す
    } finally {
      hideSpinner();
    }
  }

  return (
    <div className="loading-screen" style={{ textAlign: "center", marginTop: "50px" }}>
      <p>認証中...</p>
      {/* ここにスピナーのCSSがあれば適用 */}
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="loading-screen">読み込み中...</div>}>
      <CallbackContent />
    </Suspense>
  );
}