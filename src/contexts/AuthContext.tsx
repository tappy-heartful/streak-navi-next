"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { auth, db } from "@/src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { setSession, clearAllAppSession } from "@/src/lib/functions";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userData: any | null;
  refreshUserData: () => Promise<void>;
  // --- 共通化された権限フラグ ---
  isScoreAdmin: boolean;
  isEventAdmin: boolean;
  isCallAdmin: boolean;
  isVoteAdmin: boolean;
  isColletAdmin: boolean;
  isStudioAdmin: boolean;
  isUserAdmin: boolean;
  isNoticeAdmin: boolean;
  isBlueNoteAdmin: boolean;
  isBoardAdmin: boolean;
  isLiveAdmin: boolean;
  isTicketAdmin: boolean;
  isMediaAdmin: boolean;
  isSystemAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  userData: null,
  refreshUserData: async () => {},
  isScoreAdmin: false,
  isEventAdmin: false,
  isCallAdmin: false,
  isVoteAdmin: false,
  isColletAdmin: false,
  isStudioAdmin: false,
  isUserAdmin: false,
  isNoticeAdmin: false,
  isBlueNoteAdmin: false,
  isBoardAdmin: false,
  isLiveAdmin: false,
  isTicketAdmin: false,
  isMediaAdmin: false,
  isSystemAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // 権限判定をメモ化して共通化
  const isScoreAdmin = useMemo(() => userData?.isScoreAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isEventAdmin = useMemo(() => userData?.isEventAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isCallAdmin = useMemo(() => userData?.isCallAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isVoteAdmin = useMemo(() => userData?.isVoteAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isColletAdmin = useMemo(() => userData?.isColletAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isStudioAdmin = useMemo(() => userData?.isStudioAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isUserAdmin = useMemo(() => userData?.isUserAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isNoticeAdmin = useMemo(() => userData?.isNoticeAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isBlueNoteAdmin = useMemo(() => userData?.isBlueNoteAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isBoardAdmin = useMemo(() => userData?.isBBoardAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isLiveAdmin = useMemo(() => userData?.isLiveAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isTicketAdmin = useMemo(() => userData?.isTicketAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isMediaAdmin = useMemo(() => userData?.isMediaAdmin === true || userData?.isSystemAdmin === true, [userData]);
  const isSystemAdmin = useMemo(() => userData?.isSystemAdmin === true, [userData]);

  // Firestoreから最新データを取得する共通関数
  const fetchUserData = async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        Object.entries(data).forEach(([k, v]) => setSession(k, v));
      }
    } catch (error) {
      console.error("Fetch UserData Error:", error);
    }
  };

  const refreshUserData = async () => {
    if (user) await fetchUserData(user.uid);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        setSession("uid", firebaseUser.uid);
        await fetchUserData(firebaseUser.uid);
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
      user, 
      loading, 
      userData, 
      refreshUserData,
      isScoreAdmin,
      isEventAdmin,
      isCallAdmin,
      isVoteAdmin,
      isColletAdmin,
      isStudioAdmin,
      isUserAdmin,
      isNoticeAdmin,
      isBlueNoteAdmin,
      isBoardAdmin,
      isLiveAdmin,
      isTicketAdmin,
      isMediaAdmin,
      isSystemAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);