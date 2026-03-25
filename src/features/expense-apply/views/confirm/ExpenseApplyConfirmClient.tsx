"use client";

import React from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { FormField } from "@/src/components/Form/FormField";
import { ExpenseApply, Prefecture, ExpenseApplyHistory } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { format } from "@/src/lib/functions";
import { ExpenseHistoryList } from "@/src/components/ExpenseHistoryList";
import { TravelDetailsArea } from "@/src/components/TravelDetailsArea";
import styles from "./ExpenseApplyConfirm.module.css";

type Props = {
  expenseId: string;
  initialData: ExpenseApply;
  prefectures: Prefecture[];
  municipalityNames: Record<string, string>;
  typeNamesMap: Record<string, string>;
  history: ExpenseApplyHistory[];
};

export function ExpenseApplyConfirmClient({ 
  expenseId, 
  initialData, 
  prefectures, 
  municipalityNames, 
  typeNamesMap,
  history 
}: Props) {
  const { user } = useAuth();
  
  // 自分自身の申請であれば編集・削除が可能 (審査中または否認済みのみ)
  const isOwn = user?.uid === initialData.uid;
  const canModify = isOwn && (initialData.status === "pending" || initialData.status === "rejected");

  const getStatusInfo = (status: ExpenseApply['status']) => {
    switch (status) {
      case "approved": return { label: "承認済み ✅", color: "#4caf50", bg: "#e8f5e9" };
      case "rejected": return { label: "否認 ❌", color: "#f44336", bg: "#ffebee" };
      default: return { label: "審査中 ⏳", color: "#ffa000", bg: "#fff8e1" };
    }
  };

  const statusInfo = getStatusInfo(initialData.status);

  return (
    <BaseLayout>
      <ConfirmLayout
        name="経費申請"
        basePath="/expense-apply"
        dataId={expenseId}
        featureIdKey="expenseId"
        collectionName="expenseApplies"
        overrideAdmin={canModify} 
        hideCopy={true}
      >
        <div className={styles.statusContainer} style={{ background: statusInfo.bg, border: `1px solid ${statusInfo.color}` }}>
          <h3 className={styles.statusLabel} style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </h3>
          {initialData.adminComment && (
            <div className={styles.adminCommentBox}>
              <div className={styles.commentLabel}>
                <i className="fas fa-comment"></i> 会計からのコメント:
              </div>
              <div className={styles.commentText}>{initialData.adminComment}</div>
            </div>
          )}
        </div>

        {/* 履歴セクション */}
        <FormField label="申請・審査履歴">
          <ExpenseHistoryList history={history} />
        </FormField>

        <FormField label="種別">
          <div className="label-value">{typeNamesMap[initialData.typeId] || "不明"} / {initialData.category}</div>
        </FormField>

        {initialData.isTravel && (
          <FormField label="旅費詳細">
            <TravelDetailsArea
              departurePrefName={prefectures.find(p => p.id === initialData.departurePrefectureId)?.name || ""}
              departureMunName={municipalityNames[initialData.departureMunicipalityId || ""] || initialData.departureMunicipalityId || ""}
              arrivalPrefName={prefectures.find(p => p.id === initialData.arrivalPrefectureId)?.name || ""}
              arrivalMunName={municipalityNames[initialData.arrivalMunicipalityId || ""] || initialData.arrivalMunicipalityId || ""}
              date={initialData.date}
              height="200px"
            />
          </FormField>
        )}

        <FormField label="経費名">
          <div className="label-value" style={{ fontWeight: "bold" }}>{initialData.name}</div>
        </FormField>

        <FormField label="金額 (税込)">
          <div className={`${styles.amountValue} label-value`} style={{ color: initialData.typeId === "001" ? "#c62828" : "#2e7d32" }}>
            ¥{initialData.amount.toLocaleString()}
          </div>
        </FormField>

        <FormField label="日付">
          <div className="label-value">{initialData.date}</div>
        </FormField>

        {initialData.files && initialData.files.length > 0 && (
          <FormField label="添付ファイル">
            <div className={styles.fileGrid}>
              {initialData.files.map((file, i) => (
                <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className={styles.fileItem}>
                  <i className={`far fa-file-image ${styles.fileIcon}`}></i>
                  <span className={styles.fileName}>{file.name}</span>
                </a>
              ))}
            </div>
          </FormField>
        )}
      </ConfirmLayout>
    </BaseLayout>
  );
}
