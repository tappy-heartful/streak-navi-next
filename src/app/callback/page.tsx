"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/src/lib/firebase";
import { signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { hideSpinner, setSession, showDialog } from "@/src/lib/functions";

const MESSAGES = [
  "チューニングしています...",
  "譜面を整理しています...",
  "次のイベントを調べています...",
  "楽器を組み立てています...",
  "メンバーを呼んでいます...",
  "リハーサルの準備中です...",
  "会場を設営しています...",
  "セットリストを確認しています...",
  "リードアルトを待っています...",
  "リードトランペットを待っています...",
  "リードトロンボーンを待っています...",
  "ソロの順番を相談しています...",
  "メトロノームと戦っています...",
  "スウィング感を調整しています...",
  "譜面台を並べています...",
  "衣装のネクタイを締めています...",
  "リードの調子を確認しています...",
  "マイクチェック中... 1, 2...",
  "アドリブを練っています...",
  "ダイナミクスを意識しています...",
  "音出し禁止時間を守っています...",
  "マウスピースを洗浄しています...",
  "ロングトーンで集中しています...",
  "打ち上げの場所を検討しています...",
  "譜面の書き込みを消しています...",
  "ピッチを合わせています...",
  "前打ちと後打ちを確認しています...",
  "ドラムのセッティングを調整中です...",
  "管楽器の水分を抜いています...",
  "本番前の気合入れをしています...",
  "カウントを出しています...",
];

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasCalled = useRef(false); // 二重実行防止フラグ
  const [message, setMessage] = useState(MESSAGES[0]);

  // メッセージのランダムローテーション
  useEffect(() => {
    const interval = setInterval(() => {
      setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
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
      // ログイン時はメイン画面で演出を見せたいので showSpinner() は呼ばない
      const redirectUri = window.location.origin + window.location.pathname;

      // 自身のサーバーの API を叩く
      const data = await fetch('/api/line/login', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, state, redirectUri }),
      });
      const result = await data.json();

      if (!data.ok) {
        if (result.error === 'NOT_FRIEND') {
          await showDialog("個別連絡のため、LINE公式アカウントを友だち追加してください。追加後に再度ログインをお願いします。", true);
          window.open("https://lin.ee/Z4gtFj6", "_blank", "noopener,noreferrer");
          router.push("/login");
          return;
        }
        throw new Error(result.error);
      }

      // 2. Firebaseログイン
      const userCredential = await signInWithCustomToken(auth, result.customToken);
      const user = userCredential.user;

      // 3. Firestoreデータ更新
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      const userData = {
        displayName: result.profile.displayName,
        pictureUrl: result.profile.pictureUrl,
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

      const redirectAfterLogin = result.redirectAfterLogin || "/home";

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
    } catch (e) {
      console.error(e);
      await showDialog("ログインに失敗しました。通信環境を確認してください。", true);
      router.push("/login"); // 失敗時はログインへ戻す
    } finally {
      hideSpinner();
    }
  }

  return (
    <div className="musical-loading" style={{ marginTop: "100px" }}>
      <div className="note-container">
        <i className="fa-solid fa-music note"></i>
        <i className="fa-solid fa-note-sticky note"></i>
        <i className="fa-solid fa-guitar note"></i>
        <i className="fa-solid fa-drum note"></i>
      </div>
      <p className="loading-message">{message}</p>
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