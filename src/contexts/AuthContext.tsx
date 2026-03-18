"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { auth, db } from "@/src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { setSession, clearAllAppSession, getSession } from "@/src/lib/functions";
import { User as FirestoreUser } from "@/src/lib/firestore/types";

// 管理機能の定義
export type AdminModule = 
  | "Score" | "Event" | "Call" | "Vote" | "Studio" 
  | "User" | "Notice" | "BlueNote" | "Board" | "Live" | "Ticket" | "Media";

// パスセグメントとモジュールのマッピング
const PATH_TO_MODULE: Record<string, AdminModule> = {
  score: "Score",
  event: "Event",
  call: "Call",
  vote: "Vote",
  studio: "Studio",
  user: "User",
  notice: "Notice",
  "blue-note": "BlueNote",
  board: "Board",
  live: "Live",
  ticket: "Ticket",
  media: "Media",
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userData: FirestoreUser | null;
  refreshUserData: () => Promise<void>;
  /** 現在表示中のページ（URL）に対する管理者権限があるかどうか */
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const pathname = usePathname();

  const fetchUserData = useCallback(async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserData({ id: uid, ...data } as FirestoreUser);
        Object.entries(data).forEach(([k, v]) => setSession(k, v));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

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
   */
  const isAdmin = useMemo(() => {
    if (!pathname) return false;
    const firstSegment = pathname.split("/")[1]; 
    const currentModule = PATH_TO_MODULE[firstSegment];
    
    if (!currentModule) return false;
    return checkAdmin(currentModule);
  }, [pathname, checkAdmin]);

  useEffect(() => {
    // セッションストレージにUIDがあれば、初期のloading期間を少し長めに取って
    // Firebaseの復旧を待つような挙動を期待できる（AuthGuard側での制御に任せるためここではフラグ管理のみ）
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setSession("uid", u.uid);
        await fetchUserData(u.uid);
      } else {
        setUser(null);
        setUserData(null);
        // ログアウト時のみクリアする（起動直後のnull判定で消さないよう、初期化済みフラグを確認）
        if (initialized.current) {
          clearAllAppSession();
        }
      }
      setLoading(false);
      initialized.current = true;
    });
    return () => unsubscribe();
  }, [fetchUserData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userData,
        isAdmin,
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