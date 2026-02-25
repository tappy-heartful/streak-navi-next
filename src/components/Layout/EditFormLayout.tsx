"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormButtons } from "@/src/components/Form/FormButtons";
import { FormFooter } from "@/src/components/Form/FormFooter";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog } from "@/src/components/CommonDialog";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";

type Props = {
  featureName: string; // "譜面", "イベント" など
  basePath: string;    // "/score", "/event" など
  dataId?: string;     // 編集・コピー時に使用
  mode: "new" | "edit" | "copy";
  onSave: () => void;
  children: React.ReactNode;
};

/**
 * 編集・新規作成画面専用の枠組みレイアウト
 * 権限チェック、パンくず設定、タイトル生成、戻り先判定を自動化
 */
export const EditFormLayout = ({ 
  featureName,
  basePath,
  dataId,
  mode, 
  onSave, 
  children 
}: Props) => {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [isAuthorized, setIsAuthorized] = useState(false);

  // モードに基づいたテキストとパスの判定
  const isNew = mode === "new";
  const displayTitle = isNew ? `${featureName}新規作成` : `${featureName}編集`;
  const backHref = isNew ? basePath : `${basePath}/confirm?scoreId=${dataId}`;
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

  // パンくず設定の統合
  useEffect(() => {
    if (!isAuthorized) return;

    const crumbs = [
      { title: `${featureName}一覧`, href: basePath },
      ...(!isNew ? [{ title: `${featureName}確認`, href: `${basePath}/confirm?scoreId=${dataId}` }] : []),
      { title: displayTitle, href: "" }
    ];
    setBreadcrumbs(crumbs);
  }, [isAuthorized, featureName, basePath, dataId, mode, setBreadcrumbs, isNew, displayTitle]);

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
        <h1>{displayTitle}</h1>
      </div>
      
      <div className="container">
        {children}
        <FormButtons mode={mode} onSave={onSave} />
      </div>

      <FormFooter backHref={backHref} backText={backText} />
    </>
  );
};