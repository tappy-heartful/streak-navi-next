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
  featureIdKey: string;
  basePath: string;
  dataId?: string;
  mode: "new" | "edit" | "copy";
  children: React.ReactNode;
  form: AppFormReturn<T>;
  onSaveApi: (data: T) => Promise<string | undefined>;
};

export const EditFormLayout = <T extends Record<string, any>>({ 
  featureName, featureIdKey, basePath, dataId, mode, children, form, onSaveApi 
}: Props<T>) => {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const isNew = mode === "new";
  const displayTitle = isNew ? `${featureName}新規作成` : `${featureName}編集`;
  const confirmPath = `${basePath}/confirm?${featureIdKey}=${dataId}`;

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      showDialog("この操作を行う権限がありません。", true).then(() => router.push(basePath));
    } else {
      setIsAuthorized(true);
      setBreadcrumbs([
        { title: `${featureName}一覧`, href: basePath },
        ...(!isNew ? [{ title: `${featureName}確認`, href: confirmPath }] : []),
        { title: displayTitle, href: "" }
      ]);
    }
  }, [isAdmin, loading, isAuthorized, featureName, basePath, dataId, mode, isNew, displayTitle, confirmPath, router, setBreadcrumbs]);

  const handleSave = async () => {
    const errors = form.validate();
    if (Object.keys(errors).length > 0) return showDialog("入力内容を確認してください", true);
    if (!(await showDialog(`${mode === "edit" ? "更新" : "登録"}しますか？`))) return;

    try {
      const finalId = await onSaveApi(form.formData);
      await showDialog("保存しました", true);
      router.push(`${basePath}/confirm?${featureIdKey}=${finalId}`);
    } catch (error) {
      await showDialog("保存に失敗しました", true);
    }
  };

  if (loading || !isAuthorized) return <div style={{ padding: "2rem", textAlign: "center" }}>権限を確認中...</div>;

  return (
    <>
      <div className="page-header"><h1>{displayTitle}</h1></div>
      <div className="container">
        {children}
        <FormButtons mode={mode} onSave={handleSave} onClear={form.resetForm} />
      </div>
      <FormFooter backHref={isNew ? basePath : confirmPath} backText={isNew ? `${featureName}一覧` : `${featureName}確認`} />
    </>
  );
};