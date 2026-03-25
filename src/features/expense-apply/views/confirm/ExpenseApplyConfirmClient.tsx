"use client";

import React from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { FormField } from "@/src/components/Form/FormField";
import { ExpenseApply, Prefecture, ExpenseApplyHistory } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { format } from "@/src/lib/functions";
import { TravelRouteMap } from "@/src/components/TravelRouteMap";
import { ExpenseHistoryList } from "@/src/components/ExpenseHistoryList";

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
          <ExpenseHistoryList history={history} />
        </FormField>

        <FormField label="種別">
          <div className="label-value">{typeNamesMap[initialData.typeId] || "不明"} / {initialData.category}</div>
        </FormField>

        {initialData.isTravel && (
          <FormField label="旅費詳細">
            <div className="label-value" style={{ border: "1px solid #e3f2fd", padding: "12px", borderRadius: "8px", background: "#f1f8ff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "0.65rem", color: "#1976d2", fontWeight: "bold" }}>出発</div>
                  <div style={{ fontSize: "0.7rem", color: "#666", fontWeight: "normal", marginTop: "2px" }}>
                    {prefectures.find(p => p.id === initialData.departurePrefectureId)?.name || initialData.departurePrefectureId}
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: "bold" }}>
                    {municipalityNames[initialData.departureMunicipalityId || ""] || initialData.departureMunicipalityId}
                  </div>
                </div>
                
                <div style={{ textAlign: "center", minWidth: "50px" }}>
                  <div style={{ fontSize: "0.65rem", color: "#1976d2", fontWeight: "bold" }}>往復</div>
                  <i className="fas fa-exchange-alt" style={{ color: "#1976d2", fontSize: "0.9rem" }}></i>
                </div>

                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: "0.65rem", color: "#1976d2", fontWeight: "bold" }}>到着</div>
                  <div style={{ fontSize: "0.7rem", color: "#666", fontWeight: "normal", marginTop: "2px" }}>
                    {prefectures.find(p => p.id === initialData.arrivalPrefectureId)?.name || initialData.arrivalPrefectureId}
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: "bold" }}>
                    {municipalityNames[initialData.arrivalMunicipalityId || ""] || initialData.arrivalMunicipalityId}
                  </div>
                </div>
              </div>
              
              <TravelRouteMap
                departurePrefecture={prefectures.find(p => p.id === initialData.departurePrefectureId)?.name}
                departureMunicipality={municipalityNames[initialData.departureMunicipalityId || ""]}
                arrivalPrefecture={prefectures.find(p => p.id === initialData.arrivalPrefectureId)?.name}
                arrivalMunicipality={municipalityNames[initialData.arrivalMunicipalityId || ""]}
                departureDate={initialData.date}
                height="200px"
              />
            </div>
          </FormField>
        )}

        <FormField label="経費名">
          <div className="label-value" style={{ fontWeight: "bold" }}>{initialData.name}</div>
        </FormField>

        <FormField label="金額 (税込)">
          <div className="label-value" style={{ fontSize: "1.5rem", fontWeight: "900", color: initialData.typeId === "001" ? "#c62828" : "#2e7d32" }}>
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
