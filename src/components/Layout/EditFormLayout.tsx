"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormButtons } from "@/src/components/Form/FormButtons";
import { FormFooter } from "@/src/components/Form/FormFooter";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog } from "@/src/components/CommonDialog";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";

type Props = {
  featureName: string;
  featureIdKey: string;
  basePath: string;
  dataId?: string;
  mode: "new" | "edit" | "copy";
  children: React.ReactNode;
  // 共通化のための追加プロップス
  onValidate: () => { [key: string]: string }; // エラーオブジェクトを返す関数
  onSaveApi: () => Promise<string | undefined>; // API実行してIDを返す関数
};

export const EditFormLayout = ({ 
  featureName,
  featureIdKey,
  basePath,
  dataId,
  mode, 
  children,
  onValidate,
  onSaveApi
}: Props) => {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const isNew = mode === "new";
  const displayTitle = isNew ? `${featureName}新規作成` : `${featureName}編集`;
  const confirmPath = `${basePath}/confirm?${featureIdKey}=${dataId}`;
  const backHref = isNew ? basePath : confirmPath;
  const backText = isNew ? `${featureName}一覧` : `${featureName}確認`;

  // 権限チェック
  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      (async () => {
        await showDialog("この操作を行う権限がありません。", true);
        router.push(basePath);
      })();
    } else {
      setIsAuthorized(true);
    }
  }, [isAdmin, loading, router, basePath]);

  // パンくず設定
  useEffect(() => {
    if (!isAuthorized) return;
    const crumbs = [
      { title: `${featureName}一覧`, href: basePath },
      ...(!isNew ? [{ title: `${featureName}確認`, href: confirmPath }] : []),
      { title: displayTitle, href: "" }
    ];
    setBreadcrumbs(crumbs);
  }, [isAuthorized, featureName, basePath, dataId, mode, setBreadcrumbs, isNew, displayTitle, confirmPath]);

  /**
   * 共通保存ハンドラ
   */
  const handleSave = async () => {
    // 1. バリデーション実行
    const errors = onValidate();
    if (Object.keys(errors).length > 0) {
      return showDialog("入力内容を確認してください", true);
    }

    // 2. 確認ダイアログ
    const ok = await showDialog(`${mode === "edit" ? "更新" : "登録"}しますか？`);
    if (!ok) return;

    try {
      // 3. API実行
      const finalId = await onSaveApi();
      await showDialog("保存しました", true);

      // 4. 保存後の遷移
      router.push(`${basePath}/confirm?${featureIdKey}=${finalId}`);
    } catch (error) {
      console.error(error);
      await showDialog("保存に失敗しました", true);
    }
  };

  if (loading || !isAuthorized) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>権限を確認中...</div>;
  }

  return (
    <>
      <div className="page-header">
        <h1>{displayTitle}</h1>
      </div>
      <div className="container">
        {children}
        <FormButtons mode={mode} onSave={handleSave} />
      </div>
      <FormFooter backHref={backHref} backText={backText} />
    </>
  );
};