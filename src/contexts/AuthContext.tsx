"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { setSession, clearAllAppSession } from "@/src/lib/functions";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userData: any | null;
  refreshUserData: () => Promise<void>; // 追加
}

// 初期値に空の関数を入れておく
const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  userData: null,
  refreshUserData: async () => {} 
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Firestoreから最新データを取得する共通関数
  const fetchUserData = async (uid: string) => {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      setUserData(data);
      Object.entries(data).forEach(([k, v]) => setSession(k, v));
    }
  };

  const refreshUserData = async () => {
    if (user) await fetchUserData(user.uid);
  };

// 修正箇所を抜粋
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // 開始時に必ずtrue
      if (firebaseUser) {
        setUser(firebaseUser);
        setSession("uid", firebaseUser.uid);
        // Firestoreからの取得が終わるまで待つ
        await fetchUserData(firebaseUser.uid);
      } else {
        setUser(null);
        setUserData(null);
        clearAllAppSession();
      }
      setLoading(false); // すべて終わってからfalseにする
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, userData, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);