"use client";

import React from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { FormField } from "@/src/components/Form/FormField";
import { ExpenseApply, Prefecture, ExpenseApplyHistory } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { showSpinner, hideSpinner, showDialog, format } from "@/src/lib/functions";
import { judgeExpenseApply, undoReview } from "@/src/features/expense-review/api/expense-review-client-service";
import { useRouter } from "next/navigation";
import { ExpenseHistoryList } from "@/src/components/ExpenseHistoryList";
import { TravelDetailsArea } from "@/src/components/TravelDetailsArea";
import styles from "./ExpenseReview.module.css";

type Props = {
  expenseId: string;
  initialData: ExpenseApply;
  prefectures: Prefecture[];
  municipalityNamesMap: Record<string, string>;
  typeNamesMap: Record<string, string>;
  applicantName: string;
  history: ExpenseApplyHistory[];
};

export function ExpenseReviewClient({
  expenseId,
  initialData,
  prefectures,
  municipalityNamesMap,
  typeNamesMap,
  applicantName,
  history
}: Props) {
  const { userData } = useAuth();
  const router = useRouter();

  const getStatusInfo = (status: ExpenseApply['status']) => {
    switch (status) {
      case "approved": return { label: "承認済み", icon: "✅", color: "#4caf50", bg: "#e8f5e9" };
      case "returned": return { label: "差し戻し済み", icon: "🔄", color: "#f57c00", bg: "#fff3e0" };
      default: return { label: "審査待ち", icon: "⏳", color: "#ffa000", bg: "#fff8e1" };
    }
  };

  const statusInfo = getStatusInfo(initialData.status);


  const handleProcess = async (status: 'approved' | 'returned') => {
    const action = status === 'approved' ? "承認" : "差し戻し";
    const comment = await showDialog(
      `申請を${action}します。\nコメントを${status === 'returned' ? '必ず' : '任意で'}入力してください:\n※本操作は申請者にLINEで通知されます。`,
      false,
      true
    );

    if (comment === null) return; // キャンセル
    const commentStr = typeof comment === 'string' ? comment : "";

    if (status === 'returned' && !commentStr.trim()) {
      await showDialog("差し戻しの際はコメントが必須です", true);
      return;
    }

    showSpinner();
    try {
      await judgeExpenseApply(
        expenseId,
        status,
        commentStr,
        userData?.displayName || "不明"
      );
      await showDialog(`${action}しました`, true);
      router.refresh();
    } catch (e) {
      console.error(e);
      await showDialog("処理に失敗しました", true);
    } finally {
      hideSpinner();
    }
  };

  const handleUndo = async () => {
    const comment = await showDialog(
      "審査を取り消して「審査待ち」に戻します。\nコメントを必ず入力してください:\n※本操作は申請者にLINEで通知されます。",
      false,
      true
    );

    if (comment === null) return; // キャンセル
    const commentStr = typeof comment === 'string' ? comment : "";

    if (!commentStr.trim()) {
      await showDialog("審査待ちに戻す際はコメントが必須です", true);
      return;
    }

    showSpinner();
    try {
      await undoReview(expenseId, commentStr, userData?.displayName || "不明");
      await showDialog("審査待ちに戻しました", true);
      router.refresh();
    } catch (e) {
      console.error(e);
      await showDialog("処理に失敗しました", true);
    } finally {
      hideSpinner();
    }
  };


  return (
    <BaseLayout>
      <ConfirmLayout
        name="経費審査"
        icon="fa-solid fa-clipboard-check"
        basePath="/expense-review"
        dataId={expenseId}
        featureIdKey="expenseId"
        collectionName="expenseApplies"
        overrideAdmin={false}
        hideCopy={true}
        hideEdit={true}
        hideDelete={true}
      >
        <div className={styles.statusContainer} style={{ background: statusInfo.bg, border: `1px solid ${statusInfo.color}` }}>
          <div className={styles.statusIcon}>{statusInfo.icon}</div>
          <div className={styles.statusLabel} style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </div>

          {initialData.status !== 'pending' && (
            <div className={styles.reviewerInfo}>
              <div><strong>審査者:</strong> {initialData.reviewerName || "不明"}</div>
              <div><strong>日時:</strong> {initialData.reviewedAt ? format(initialData.reviewedAt, 'yyyy/MM/dd HH:mm') : "不明"}</div>
            </div>
          )}
        </div>

        <FormField label="申請・審査履歴">
          <ExpenseHistoryList history={history} />
        </FormField>

        <FormField label="申請者">
          <div className="label-value" style={{ fontWeight: "bold" }}>{applicantName}</div>
        </FormField>

        <FormField label="種別">
          <div className="label-value">{typeNamesMap[initialData.typeId] || "不明"} / {initialData.category}</div>
        </FormField>

        {initialData.isTravel && initialData.eventTitle && (
          <FormField label="対象イベント">
            <div className="label-value">{initialData.eventTitle}</div>
          </FormField>
        )}

        {initialData.isTravel && (
          <FormField label="旅費詳細">
            <TravelDetailsArea
              departurePrefName={prefectures.find(p => p.id === initialData.departurePrefectureId)?.name || ""}
              departureMunName={municipalityNamesMap[initialData.departureMunicipalityId || ""] || initialData.departureMunicipalityId || ""}
              arrivalPrefName={prefectures.find(p => p.id === initialData.arrivalPrefectureId)?.name || ""}
              arrivalMunName={municipalityNamesMap[initialData.arrivalMunicipalityId || ""] || initialData.arrivalMunicipalityId || ""}
              date={initialData.date}
              height="220px"
            />
          </FormField>
        )}

        <FormField label="経費名">
          <div className="label-value">{initialData.name}</div>
        </FormField>

        <FormField label="金額 (税込)">
          <div className={`${styles.amountValue} label-value`} style={{ color: initialData.typeId === "001" ? "#c62828" : "#2e7d32" }}>
            ¥{initialData.amount.toLocaleString()}
          </div>
        </FormField>

        <FormField label="発生日">
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

        <div className={styles.actionSection}>
          <h4 className={styles.actionTitle}>審査アクション</h4>
          <div className={styles.actionNotice}>
            <i className={`fab fa-line ${styles.actionLineIcon}`}></i>
            ※審査アクションを実行すると、申請者本人にLINEで通知が送信されます。
          </div>
          <div className={styles.buttonGroup}>
            {initialData.status !== 'approved' && (
              <button
                onClick={() => handleProcess('approved')}
                className={styles.approveBtn}
              >
                <i className={`fas fa-check-circle ${styles.btnIcon}`}></i>
                承認する
              </button>
            )}
            {initialData.status !== 'returned' && (
              <button
                onClick={() => handleProcess('returned')}
                className={styles.rejectBtn}
              >
                <i className={`fas fa-undo ${styles.btnIcon}`}></i>
                差し戻す
              </button>
            )}
            {initialData.status !== 'pending' && (
              <button
                onClick={handleUndo}
                className={styles.undoBtn}
              >
                <i className={`fas fa-rotate-left ${styles.btnIcon}`}></i>
                審査待ちに戻す
              </button>
            )}
          </div>
        </div>
      </ConfirmLayout>
    </BaseLayout>
  );
}
