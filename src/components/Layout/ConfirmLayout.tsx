"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormFooter } from "../Form/FormFooter";
import { DetailActionButtons } from "../Form/DetailActionButtons";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { showDialog } from "@/src/components/CommonDialog";
import { archiveAndDeleteDoc } from "@/src/lib/functions";

type Props = {
  name: string;        // "譜面"
  basePath: string;    // "/score"
  dataId: string;
  collectionName: string; // "scores"
  children: React.ReactNode;
};

export const ConfirmLayout = ({ 
  name, 
  basePath, 
  dataId,
  collectionName,
  children 
}: Props) => {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbs([
      { title: `${name}一覧`, href: basePath },
      { title: `${name}確認`, href: "" },
    ]);
  }, [setBreadcrumbs, name, basePath]);

  // 編集・コピーの遷移をパターン化
  const onEdit = () => router.push(`${basePath}/edit?mode=edit&scoreId=${dataId}`);
  const onCopy = () => router.push(`${basePath}/edit?mode=copy&scoreId=${dataId}`);

  // 削除ロジックを共通化
  const onDelete = async () => {
    const confirmed = await showDialog(`この${name}を削除しますか？\nこの操作は元に戻せません。`);
    if (!confirmed) return;

    try {
      await archiveAndDeleteDoc(collectionName, dataId);
      await showDialog("削除しました", true);
      router.push(basePath);
    } catch (e) {
      console.error(e);
      await showDialog("削除に失敗しました", true);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>{name}確認</h1>
      </div>

      <div className="container">
        {children}
        
        {isAdmin && (
          <DetailActionButtons 
            show={isAdmin}
            onEdit={onEdit}
            onCopy={onCopy}
            onDelete={onDelete}
          />
        )}
      </div>

      <FormFooter backHref={basePath} backText={`${name}一覧`} />
    </>
  );
};