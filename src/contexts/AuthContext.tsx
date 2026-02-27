"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { auth, db } from "@/src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { setSession, clearAllAppSession } from "@/src/lib/functions";

// 管理機能の定義
export type AdminModule = 
  | "Score" | "Event" | "Call" | "Vote" | "Collect" | "Studio" 
  | "User" | "Notice" | "BlueNote" | "Board" | "Live" | "Ticket" | "Media";

// パスセグメントとモジュールのマッピング
const PATH_TO_MODULE: Record<string, AdminModule> = {
  score: "Score",
  event: "Event",
  call: "Call",
  vote: "Vote",
  collect: "Collect",
  studio: "Studio",
  user: "User",
  notice: "Notice",
  bluenote: "BlueNote",
  board: "Board",
  live: "Live",
  ticket: "Ticket",
  media: "Media",
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userData: any | null;
  refreshUserData: () => Promise<void>;
  /** 現在表示中のページ（URL）に対する管理者権限があるかどうか */
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const fetchUserData = async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        Object.entries(data).forEach(([k, v]) => setSession(k, v));
      }
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * 特定のモジュールの権限を判定する内部ロジック
   */
  const checkAdmin = useCallback(
    (module: AdminModule): boolean => {
      if (!userData) return false;
      if (userData.isSystemAdmin === true) return true;
      return userData[`is${module}Admin`] === true;
    },
    [userData]
  );

  /**
   * 現在のパスに基づいた isAdmin (boolean) を計算
   * URLが /score/edit なら "Score" の権限を確認する
   */
  const isAdmin = useMemo(() => {
    if (!pathname) return false;
    const firstSegment = pathname.split("/")[1]; // "/score/edit" -> "score"
    const currentModule = PATH_TO_MODULE[firstSegment];
    
    if (!currentModule) return false;
    return checkAdmin(currentModule);
  }, [pathname, checkAdmin]);

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
    <AuthContext.Provider
      value={{
        user,
        loading,
        userData,
        isAdmin, // 現在のページの権限
        refreshUserData: async () => {
          if (user) await fetchUserData(user.uid);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};