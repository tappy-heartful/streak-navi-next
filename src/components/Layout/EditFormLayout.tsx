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
  onValidate: () => { [key: string]: string }; 
  onSaveApi: () => Promise<string | undefined>;
  onClear: () => void; // ★ 追加
};

export const EditFormLayout = ({ 
  featureName,
  featureIdKey,
  basePath,
  dataId,
  mode, 
  children,
  onValidate,
  onSaveApi,
  onClear // ★ 追加
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

  useEffect(() => {
    if (!isAuthorized) return;
    const crumbs = [
      { title: `${featureName}一覧`, href: basePath },
      ...(!isNew ? [{ title: `${featureName}確認`, href: confirmPath }] : []),
      { title: displayTitle, href: "" }
    ];
    setBreadcrumbs(crumbs);
  }, [isAuthorized, featureName, basePath, dataId, mode, setBreadcrumbs, isNew, displayTitle, confirmPath]);

  const handleSave = async () => {
    const errors = onValidate();
    if (Object.keys(errors).length > 0) {
      return showDialog("入力内容を確認してください", true);
    }

    const ok = await showDialog(`${mode === "edit" ? "更新" : "登録"}しますか？`);
    if (!ok) return;

    try {
      const finalId = await onSaveApi();
      await showDialog("保存しました", true);
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
        {/* ★ onClear を渡す */}
        <FormButtons mode={mode} onSave={handleSave} onClear={onClear} />
      </div>
      <FormFooter backHref={backHref} backText={backText} />
    </>
  );
};