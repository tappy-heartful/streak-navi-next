"use client";

import React from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { FormField } from "@/src/components/Form/FormField";
import { ExpenseApply, Prefecture } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { showSpinner, hideSpinner, showDialog, format } from "@/src/lib/functions";
import { judgeExpenseApply } from "@/src/features/expense-review/api/expense-review-client-service";
import { useRouter } from "next/navigation";

type Props = {
  expenseId: string;
  initialData: ExpenseApply;
  prefectures: Prefecture[];
  municipalityNamesMap: Record<string, string>;
  applicantName: string;
};

export function ExpenseReviewClient({ 
  expenseId, 
  initialData, 
  prefectures, 
  municipalityNamesMap,
  applicantName 
}: Props) {
  const { userData } = useAuth();
  const router = useRouter();
  
  const getStatusLabel = (status: ExpenseApply['status']) => {
    switch (status) {
      case "approved": return "承認済み ✅";
      case "rejected": return "否認 ❌";
      default: return "審査中 ⏳";
    }
  };

  const getPointName = (prefId?: string, munId?: string) => {
    if (!prefId || !munId) return "";
    const pName = prefectures.find(p => p.id === prefId)?.name || prefId;
    const mName = municipalityNamesMap[munId] || munId;
    return `${mName} (${pName})`;
  };

  const handleProcess = async (status: 'approved' | 'rejected') => {
    const action = status === 'approved' ? "承認" : "拒否";
    const comment = await showDialog(
      `${action}します。${status === 'rejected' ? '【必須】' : ''}コメントを入力してください:`, 
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
      router.push("/expense-review");
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
        overrideAdmin={false} // 審査画面なので編集・削除はさせない
        hideCopy={true}
        hideEdit={true}
        hideDelete={true}
      >
        <div style={{ marginBottom: "2rem", padding: "15px", background: "#f8f9fa", borderRadius: "10px", border: "1px solid #dee2e6" }}>
          <h3 style={{ marginTop: 0, fontSize: "1rem", color: "#495057" }}>審査ステータス</h3>
          <div style={{ fontSize: "1.2rem", fontWeight: "bold", padding: "10px", background: "#fff", borderRadius: "8px", textAlign: "center", border: "1px solid #ced4da" }}>
            {getStatusLabel(initialData.status)}
          </div>
          
          {initialData.status !== 'pending' && (
            <div style={{ marginTop: "15px", fontSize: "0.9rem", color: "#666" }}>
              <div><strong>審査者:</strong> {initialData.reviewerName || "不明"}</div>
              <div><strong>審査日:</strong> {initialData.reviewedAt ? format(initialData.reviewedAt, 'yyyy/MM/dd HH:mm') : "不明"}</div>
              {initialData.adminComment && (
                <div style={{ marginTop: "10px", padding: "10px", background: "#fff3e0", borderRadius: "8px", border: "1px solid #ffe0b2", color: "#333" }}>
                  <strong>コメント:</strong>
                  <div style={{ marginTop: "4px", whiteSpace: "pre-wrap" }}>{initialData.adminComment}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <FormField label="申請者">
          <div className="label-value">{applicantName}</div>
        </FormField>

        <FormField label="種別">
          <div className="label-value">{initialData.type === "expenditure" ? "支出" : "収入"} / {initialData.category}</div>
        </FormField>

        {initialData.isTravel && (
          <FormField label="旅費詳細">
            <div className="label-value">
              {getPointName(initialData.departurePrefectureId, initialData.departureMunicipalityId)}
              <br />
              ↓
              <br />
              {getPointName(initialData.arrivalPrefectureId, initialData.arrivalMunicipalityId)}
            </div>
          </FormField>
        )}

        <FormField label="経費名">
          <div className="label-value">{initialData.name}</div>
        </FormField>

        <FormField label="金額">
          <div className="label-value" style={{ fontSize: "1.5rem", fontWeight: "bold", color: initialData.type === "expenditure" ? "#c62828" : "#2e7d32" }}>
            ¥{initialData.amount.toLocaleString()}
          </div>
        </FormField>

        <FormField label="日付">
          <div className="label-value">{initialData.date}</div>
        </FormField>

        {initialData.files && initialData.files.length > 0 && (
          <FormField label="添付ファイル">
            <ul style={{ listStyle: "none", padding: 0 }}>
              {initialData.files.map((file, i) => (
                <li key={i} style={{ marginBottom: "10px" }}>
                  <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "#1a73e8" }}>
                    <i className="far fa-file-image"></i>
                    <span>{file.name}</span>
                    <i className="fas fa-external-link-alt" style={{ fontSize: "0.8em" }}></i>
                  </a>
                </li>
              ))}
            </ul>
          </FormField>
        )}

        {initialData.status === 'pending' && (
          <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "2px solid #eee", display: "flex", gap: "10px", justifyContent: "center" }}>
            <button 
              onClick={() => handleProcess('approved')}
              className="save-button"
              style={{ padding: "12px 30px", fontSize: "1rem", background: "#4caf50" }}
            >
              承認する
            </button>
            <button 
              onClick={() => handleProcess('rejected')}
              className="delete-button"
              style={{ padding: "12px 30px", fontSize: "1rem", background: "#f44336", border: "none", color: "white", borderRadius: "8px", cursor: "pointer" }}
            >
              拒否する
            </button>
          </div>
        )}

        <div style={{ marginTop: "20px", fontSize: "0.85rem", color: "#666", textAlign: "right" }}>
          申請日: {initialData.createdAt ? format(initialData.createdAt, 'yyyy/MM/dd HH:mm') : "不明"}
        </div>
      </ConfirmLayout>
    </BaseLayout>
  );
}
