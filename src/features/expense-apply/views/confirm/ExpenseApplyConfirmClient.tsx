"use client";

import React from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { FormField } from "@/src/components/Form/FormField";
import { ExpenseApply, Prefecture, ExpenseApplyHistory } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { format } from "@/src/lib/functions";

type Props = {
  expenseId: string;
  initialData: ExpenseApply;
  prefectures: Prefecture[];
  municipalityNames: Record<string, string>;
  history: ExpenseApplyHistory[];
};

export function ExpenseApplyConfirmClient({ expenseId, initialData, prefectures, municipalityNames, history }: Props) {
  const { user } = useAuth();
  
  // 自分自身の申請であれば編集・削除が可能 (審査中または否認済みのみ)
  const isOwn = user?.uid === initialData.uid;
  const canModify = isOwn && (initialData.status === "pending" || initialData.status === "rejected");

  const getStatusLabel = (status: ExpenseApply['status']) => {
    switch (status) {
      case "approved": return "承認済み ✅";
      case "rejected": return "否認 ❌";
      default: return "審査待ち ⏳";
    }
  };

  const getPointName = (prefId?: string, munId?: string) => {
    if (!prefId || !munId) return "";
    const pName = prefectures.find(p => p.id === prefId)?.name || prefId;
    const mName = municipalityNames[munId] || munId;
    return `${mName} (${pName})`;
  };

  const getHistoryLabel = (type: string) => {
    switch (type) {
      case 'created': return '申請作成';
      case 'updated': return '再申請/修正';
      case 'reviewed': return '審査実施';
      case 'commented': return 'コメント追加';
      default: return type;
    }
  };

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

        {/* 履歴セクション */}
        <FormField label="申請・審査履歴">
          <div style={{ background: "#fafafa", borderRadius: "8px", border: "1px solid #eee", padding: "10px" }}>
            {history.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.85rem" }}>
                {history.map((h, i) => (
                  <li key={h.id || i} style={{ padding: "8px 0", borderBottom: i === history.length - 1 ? "none" : "1px dashed #ddd" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#666", marginBottom: "2px" }}>
                      <span>{format(h.createdAt, 'yyyy/MM/dd HH:mm')}</span>
                      <span style={{ fontWeight: "bold" }}>{getHistoryLabel(h.type)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{h.actorName}</span>
                      <span style={{ 
                        color: h.status === 'approved' ? '#4caf50' : h.status === 'rejected' ? '#f44336' : '#999',
                        fontWeight: "bold"
                      }}>
                        {h.status === 'approved' ? '承認' : h.status === 'rejected' ? '否認' : '審査待ち'}
                      </span>
                    </div>
                    {h.comment && (
                      <div style={{ marginTop: "4px", padding: "4px 8px", background: "#fff", borderRadius: "4px", border: "1px solid #eee", color: "#333" }}>
                        {h.comment}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: "#999", textAlign: "center", fontSize: "0.8rem" }}>履歴はありません</div>
            )}
          </div>
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
      </ConfirmLayout>
    </BaseLayout>
  );
}
