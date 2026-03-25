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
      case "rejected": return { label: "否認済み", icon: "❌", color: "#f44336", bg: "#ffebee" };
      default: return { label: "審査中", icon: "⏳", color: "#ffa000", bg: "#fff8e1" };
    }
  };

  const statusInfo = getStatusInfo(initialData.status);


  const handleProcess = async (status: 'approved' | 'rejected') => {
    const action = status === 'approved' ? "承認" : "拒否";
    const comment = await showDialog(
      `申請を${action}します。\nコメントを${status === 'rejected' ? '必ず' : '任意で'}入力してください:\n※本操作は申請者にLINEで通知されます。`,
      false,
      true
    );

    if (comment === null) return; // キャンセル
    const commentStr = typeof comment === 'string' ? comment : "";

    if (status === 'rejected' && !commentStr.trim()) {
      await showDialog("拒否の際はコメントが必須です", true);
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
        basePath="/expense-review"
        dataId={expenseId}
        featureIdKey="expenseId"
        collectionName="expenseApplies"
        overrideAdmin={false}
        hideCopy={true}
        hideEdit={true}
        hideDelete={true}
      >
        <div style={{
          marginBottom: "2rem",
          padding: "20px",
          background: statusInfo.bg,
          borderRadius: "15px",
          border: `1px solid ${statusInfo.color}`,
          textAlign: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>{statusInfo.icon}</div>
          <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: statusInfo.color }}>
            {statusInfo.label}
          </div>

          {initialData.status !== 'pending' && (
            <div style={{ marginTop: "15px", fontSize: "0.85rem", color: "#555", borderTop: "1px dashed #ccc", paddingTop: "10px" }}>
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
          <div className="label-value" style={{ fontSize: "1.8rem", fontWeight: "900", color: initialData.typeId === "001" ? "#c62828" : "#2e7d32" }}>
            ¥{initialData.amount.toLocaleString()}
          </div>
        </FormField>

        <FormField label="発生日">
          <div className="label-value">{initialData.date}</div>
        </FormField>

        {initialData.files && initialData.files.length > 0 && (
          <FormField label="添付ファイル">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
              {initialData.files.map((file, i) => (
                <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                  padding: "10px", background: "#f1f3f4", borderRadius: "8px", textDecoration: "none", color: "#1a73e8"
                }}>
                  <i className="far fa-file-image" style={{ fontSize: "2rem" }}></i>
                  <span style={{ fontSize: "0.75rem", textAlign: "center", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{file.name}</span>
                </a>
              ))}
            </div>
          </FormField>
        )}

        <div style={{ marginTop: "40px", paddingTop: "30px", borderTop: "1px solid #eee" }}>
          <h4 style={{ textAlign: "center", fontSize: "0.9rem", color: "#888", marginBottom: "8px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>審査アクション</h4>
          <div style={{ textAlign: "center", fontSize: "0.75rem", color: "#999", marginBottom: "20px" }}>
            <i className="fab fa-line" style={{ marginRight: "4px", color: "#06C755" }}></i>
            ※審査アクションを実行すると、申請者本人にLINEで通知が送信されます。
          </div>
          <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => handleProcess('approved')}
              className="save-button"
              style={{ padding: "14px 28px", fontSize: "1rem", background: "#4caf50", boxShadow: "0 4px 10px rgba(76, 175, 80, 0.3)" }}
              disabled={initialData.status === 'approved'}
            >
              <i className="fas fa-check-circle" style={{ marginRight: "8px" }}></i>
              承認する
            </button>
            <button
              onClick={() => handleProcess('rejected')}
              className="delete-button"
              style={{ padding: "14px 28px", fontSize: "1rem", background: "#f44336", boxShadow: "0 4px 10px rgba(244, 67, 54, 0.3)", border: "none", color: "white", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              disabled={initialData.status === 'rejected'}
            >
              <i className="fas fa-times-circle" style={{ marginRight: "8px" }}></i>
              否認する
            </button>
            {initialData.status !== 'pending' && (
              <button
                onClick={handleUndo}
                className="edit-button"
                style={{ padding: "14px 28px", fontSize: "1rem", background: "#607d8b", boxShadow: "0 4px 10px rgba(96, 125, 139, 0.3)", border: "none", color: "white", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              >
                <i className="fas fa-undo" style={{ marginRight: "8px" }}></i>
                審査待ちに戻す
              </button>
            )}
          </div>
        </div>
      </ConfirmLayout>
    </BaseLayout>
  );
}
