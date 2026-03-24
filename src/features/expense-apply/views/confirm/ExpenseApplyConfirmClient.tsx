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

  const getStatusInfo = (status: ExpenseApply['status']) => {
    switch (status) {
      case "approved": return { label: "承認済み ✅", color: "#4caf50", bg: "#e8f5e9" };
      case "rejected": return { label: "否認 ❌", color: "#f44336", bg: "#ffebee" };
      default: return { label: "審査中 ⏳", color: "#ffa000", bg: "#fff8e1" };
    }
  };

  const statusInfo = getStatusInfo(initialData.status);

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
        <div style={{ 
          marginBottom: "2rem", 
          padding: "15px", 
          background: statusInfo.bg, 
          borderRadius: "12px", 
          border: `1px solid ${statusInfo.color}`,
          textAlign: "center"
        }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", color: statusInfo.color }}>
            {statusInfo.label}
          </h3>
          {initialData.adminComment && (
            <div style={{ marginTop: "10px", padding: "10px", background: "#fff", borderRadius: "8px", border: "1px solid #ffe0b2", textAlign: "left" }}>
              <div style={{ fontSize: "0.75rem", color: "#e65100", fontWeight: "bold", marginBottom: "4px" }}>
                <i className="fas fa-comment"></i> 会計からのコメント:
              </div>
              <div style={{ fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{initialData.adminComment}</div>
            </div>
          )}
        </div>

        {/* 履歴セクション */}
        <FormField label="申請・審査履歴">
          <div style={{ background: "#fafafa", borderRadius: "12px", border: "1px solid #eee", padding: "12px" }}>
            {history.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.85rem" }}>
                {history.map((h, i) => (
                  <li key={h.id || i} style={{ padding: "10px 0", borderBottom: i === history.length - 1 ? "none" : "1px solid #eee" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#888", marginBottom: "4px", fontSize: "0.8rem" }}>
                      <span>{format(h.createdAt, 'yyyy/MM/dd HH:mm')}</span>
                      <span style={{ fontWeight: "bold" }}>{getHistoryLabel(h.type)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: "600" }}>{h.actorName}</span>
                      <span style={{ 
                        color: h.status === 'approved' ? '#4caf50' : h.status === 'rejected' ? '#f44336' : '#999',
                        fontWeight: "bold"
                      }}>
                        {h.status === 'approved' ? '承認' : h.status === 'rejected' ? '否認' : '審査待ち'}
                      </span>
                    </div>
                    {h.comment && (
                      <div style={{ marginTop: "6px", padding: "8px", background: "#fff", borderRadius: "6px", border: "1px solid #eee", color: "#333", fontSize: "0.85rem" }}>
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
            <div className="label-value" style={{ border: "1px solid #eee", padding: "10px", borderRadius: "8px", background: "#fafafa" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "#999" }}>出発</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: "bold" }}>{getPointName(initialData.departurePrefectureId, initialData.departureMunicipalityId)}</div>
                </div>
                <i className="fas fa-chevron-right" style={{ color: "#ccc", fontSize: "0.8rem" }}></i>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem", color: "#999" }}>到着</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: "bold" }}>{getPointName(initialData.arrivalPrefectureId, initialData.arrivalMunicipalityId)}</div>
                </div>
              </div>
            </div>
          </FormField>
        )}

        <FormField label="経費名">
          <div className="label-value" style={{ fontWeight: "bold" }}>{initialData.name}</div>
        </FormField>

        <FormField label="金額 (税込)">
          <div className="label-value" style={{ fontSize: "1.5rem", fontWeight: "900", color: initialData.type === "expenditure" ? "#c62828" : "#2e7d32" }}>
            ¥{initialData.amount.toLocaleString()}
          </div>
        </FormField>

        <FormField label="日付">
          <div className="label-value">{initialData.date}</div>
        </FormField>

        {initialData.files && initialData.files.length > 0 && (
          <FormField label="添付ファイル">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
              {initialData.files.map((file, i) => (
                <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", textDecoration: "none", color: "#1a73e8", padding: "10px", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #eee" }}>
                  <i className="far fa-file-image" style={{ fontSize: "1.5rem" }}></i>
                  <span style={{ fontSize: "0.7rem", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{file.name}</span>
                </a>
              ))}
            </div>
          </FormField>
        )}
      </ConfirmLayout>
    </BaseLayout>
  );
}
