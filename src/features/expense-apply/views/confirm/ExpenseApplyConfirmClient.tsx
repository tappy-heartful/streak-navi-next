"use client";

import React from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { FormField } from "@/src/components/Form/FormField";
import { ExpenseApply, Prefecture } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";

type Props = {
  expenseId: string;
  initialData: ExpenseApply;
  prefectures: Prefecture[];
  municipalityNames: Record<string, string>;
};

export function ExpenseApplyConfirmClient({ expenseId, initialData, prefectures, municipalityNames }: Props) {
  const { user } = useAuth();
  
  // 自分自身の申請であれば編集・削除が可能 (審査中のみ)
  const isOwn = user?.uid === initialData.uid;
  const canEdit = isOwn && initialData.status === "pending";

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
    const mName = municipalityNames[munId] || munId;
    return `${mName} (${pName})`;
  };

  return (
    <BaseLayout>
      <ConfirmLayout
        name="経費申請"
        basePath="/expense-apply"
        dataId={expenseId}
        featureIdKey="expenseId"
        collectionName="expenseApplies"
        overrideAdmin={canEdit} // 審査中且つ自分なら編集可
        hideCopy={true}
      >
        <FormField label="現在の状態">
          <div style={{ fontSize: "1.2rem", fontWeight: "bold", padding: "10px", background: "#f5f5f7", borderRadius: "8px", textAlign: "center" }}>
            {getStatusLabel(initialData.status)}
          </div>
          {initialData.adminComment && (
            <div style={{ marginTop: "10px", padding: "10px", background: "#fff3e0", borderRadius: "8px", border: "1px solid #ffe0b2" }}>
              <strong>会計からのコメント:</strong>
              <div style={{ marginTop: "4px", whiteSpace: "pre-wrap" }}>{initialData.adminComment}</div>
            </div>
          )}
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
          <div className="label-value" style={{ fontSize: "1.2rem", fontWeight: "bold", color: initialData.type === "expenditure" ? "#c62828" : "#2e7d32" }}>
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

        <div style={{ marginTop: "20px", fontSize: "0.85rem", color: "#666", textAlign: "right" }}>
          申請日: {new Date(initialData.createdAt).toLocaleDateString()}
        </div>
      </ConfirmLayout>
    </BaseLayout>
  );
}
