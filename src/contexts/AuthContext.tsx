"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "@/src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { setSession, clearAllAppSession } from "@/src/lib/functions";

// 管理機能の定義
export type AdminModule = 
  | "Score" | "Event" | "Call" | "Vote" | "Collect" | "Studio" 
  | "User" | "Notice" | "BlueNote" | "Board" | "Live" | "Ticket" | "Media";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userData: any | null;
  refreshUserData: () => Promise<void>;
  // 権限チェック関数
  isAdmin: (module?: AdminModule) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        Object.entries(data).forEach(([k, v]) => setSession(k, v));
      }
    } catch (e) { console.error(e); }
  };

  // 権限判定ロジックを1つに集約
  const isAdmin = useCallback((module?: AdminModule): boolean => {
    if (!userData) return false;
    // システム管理者は全権限OK
    if (userData.isSystemAdmin === true) return true;
    // モジュール指定がない場合は、何らかの管理者であればOKとするならここ
    if (!module) return false;

    // 例: isAdmin("Score") なら userData.isScoreAdmin を見る
    return userData[`is${module}Admin`] === true;
  }, [userData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (u) {
        setUser(u);
        setSession("uid", u.uid);
        await fetchUserData(u.uid);
      } else {
        setUser(null);
        setUserData(null);
        clearAllAppSession();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, loading, userData, isAdmin,
      refreshUserData: async () => { if (user) await fetchUserData(user.uid); } 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};