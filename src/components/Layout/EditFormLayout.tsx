"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormButtons } from "@/src/components/Form/FormButtons";
import { FormFooter } from "@/src/components/Form/FormFooter";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog } from "@/src/components/CommonDialog";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { AppFormReturn } from "@/src/hooks/useAppForm";

type Props<T extends Record<string, any>> = {
  featureName: string;
  icon?: string;
  featureIdKey: string;
  basePath: string;
  dataId?: string;
  mode: "new" | "edit" | "copy";
  overrideAdmin?: boolean; // 権限を強制的に付与する場合（自分自身のページなど）
  children: React.ReactNode;
  form: AppFormReturn<T>;
  onSaveApi: (data: T) => Promise<string | undefined>;
};

export const EditFormLayout = <T extends Record<string, any>>({
  featureName, icon, featureIdKey, basePath, dataId, mode, overrideAdmin, children, form, onSaveApi
}: Props<T>) => {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const isNew = mode === "new";
  const displayTitle = isNew ? `${featureName}新規作成` : `${featureName}編集`;
  const confirmPath = `${basePath}/confirm?${featureIdKey}=${dataId}`;
  
  const effectiveIsAdmin = overrideAdmin ?? isAdmin;

  useEffect(() => {
    if (loading) return;
    if (!effectiveIsAdmin) {
      showDialog("この操作を行う権限がありません。", true).then(() => router.push(basePath));
    } else {
      setIsAuthorized(true);
      setBreadcrumbs([
        { title: `${featureName}一覧`, href: basePath },
        ...(!isNew ? [{ title: `${featureName}確認`, href: confirmPath }] : []),
        { title: displayTitle, href: "" }
      ]);
    }
  }, [effectiveIsAdmin, loading, isAuthorized, featureName, basePath, dataId, mode, isNew, displayTitle, confirmPath, router, setBreadcrumbs]);

  const handleSave = async () => {
    const errors = form.validate();
    if (Object.keys(errors).length > 0) return showDialog("入力内容を確認してください", true);
    if (!(await showDialog(`${mode === "edit" ? "更新" : "登録"}しますか？`))) return;

    const { showSpinner, hideSpinner } = await import("@/src/lib/functions");
    showSpinner();
    try {
      const finalId = await onSaveApi(form.formData);
      hideSpinner();
      await showDialog("保存しました", true);
      
      showSpinner(); // 遷移用スピナー
      router.push(`${basePath}/confirm?${featureIdKey}=${finalId}`);
    } catch (error) {
      hideSpinner();
      const msg = error instanceof Error ? error.message : "";
      if (msg.startsWith("validation:")) {
        await showDialog(msg.slice("validation:".length), true);
      } else {
        await showDialog("保存に失敗しました", true);
      }
    }
  };

  if (loading || !isAuthorized) return <div style={{ padding: "2rem", textAlign: "center" }}>権限を確認中...</div>;

  return (
    <>
      <div className="page-header"><h1>{icon && <><i className={icon} />{" "}</>}{displayTitle}</h1></div>
      <div className="container">
        {children}
        <FormButtons mode={mode} onSave={handleSave} onClear={form.resetForm} />
      </div>
      <FormFooter backHref={isNew ? basePath : confirmPath} backText={isNew ? `${featureName}一覧` : `${featureName}確認`} />
    </>
  );
};