"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormFooter } from "../Form/FormFooter";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";

type Props = {
  featureName: string;    // "曲募集"
  icon?: string;
  basePath: string;       // "/call"
  featureIdKey: string;   // "callId"
  dataId: string;         // callId
  mode: "new" | "edit";
  onSave: () => Promise<void>;
  /** 既存回答を読み込み中かどうか（trueの間はローディング表示） */
  isLoading?: boolean;
  children: React.ReactNode;
};

/**
 * 回答フォーム画面の共通レイアウト
 * 管理者権限は不要（ログイン済みユーザーなら誰でも利用可能）
 * 投票・出欠・曲募集など「ユーザーが回答する」編集画面で共通利用する
 */
export const AnswerEditLayout = ({
  featureName, icon, basePath, featureIdKey, dataId,
  mode, onSave, isLoading = false, children
}: Props) => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const confirmPath = `${basePath}/confirm?${featureIdKey}=${dataId}`;
  const title = mode === "edit" ? "回答修正" : "回答登録";
  const saveButtonText = mode === "edit" ? "回答を修正する" : "回答を登録する";

  useEffect(() => {
    setBreadcrumbs([
      { title: `${featureName}一覧`, href: basePath },
      { title: `${featureName}確認`, href: confirmPath },
      { title, href: "" },
    ]);
  }, [setBreadcrumbs, featureName, basePath, confirmPath, title]);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user || isLoading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>読み込み中...</div>;
  }

  return (
    <>
      <div className="page-header">
        <h1>{icon && <><i className={icon} />{" "}</>}{title}</h1>
      </div>

      <main className="container">
        {children}

        <div className="confirm-buttons" style={{ marginTop: "1.5rem" }}>
          <button type="button" className="save-button" onClick={onSave}>
            {saveButtonText}
          </button>
        </div>
      </main>

      <FormFooter backHref={confirmPath} backText={`${featureName}確認`} />
    </>
  );
};
