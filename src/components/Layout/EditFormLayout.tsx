"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormButtons } from "@/src/components/Form/FormButtons";
import { FormFooter } from "@/src/components/Form/FormFooter";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog } from "@/src/components/CommonDialog";

type Props = {
  title: string;
  mode: "new" | "edit" | "copy";
  onSave: () => void;
  backHref: string;
  backText: string;
  children: React.ReactNode;
};

/**
 * 編集・新規作成画面専用の枠組みレイアウト
 * 権限チェックを行い、権限がない場合は前の画面へ戻す
 */
export const EditFormLayout = ({ 
  title, 
  mode, 
  onSave, 
  backHref, 
  backText, 
  children 
}: Props) => {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 認証情報の読み込み完了を待つ
    if (loading) return;

    if (!isAdmin) {
      // 非同期でダイアログを表示してから遷移
      (async () => {
        await showDialog("この操作を行う権限がありません。", true);
        router.push(backHref);
      })();
    } else {
      setIsAuthorized(true);
    }
  }, [isAdmin, loading, router, backHref]);

  // 読み込み中や権限チェック中はコンテンツを表示しない（チラ見え防止）
  if (loading || !isAuthorized) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
        権限を確認中...
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>{title}</h1>
      </div>
      
      <div className="container">
        {children}
        <FormButtons mode={mode} onSave={onSave} />
      </div>

      <FormFooter backHref={backHref} backText={backText} />
    </>
  );
};