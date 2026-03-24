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

type Props = {
  expenseId: string;
  initialData: ExpenseApply;
  prefectures: Prefecture[];
  municipalityNamesMap: Record<string, string>;
  applicantName: string;
  history: ExpenseApplyHistory[];
};

export function ExpenseReviewClient({ 
  expenseId, 
  initialData, 
  prefectures, 
  municipalityNamesMap,
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
      router.refresh();
    } catch (e) {
      console.error(e);
      await showDialog("処理に失敗しました", true);
    } finally {
      hideSpinner();
    }
  };

  const handleUndo = async () => {
    const confirmed = await showDialog("審査を取り消して「審査待ち」に戻しますか？");
    if (!confirmed) return;

    showSpinner();
    try {
      await undoReview(expenseId, userData?.displayName || "不明");
      await showDialog("審査待ちに戻しました", true);
      router.refresh();
    } catch (e) {
      console.error(e);
      await showDialog("処理に失敗しました", true);
    } finally {
      hideSpinner();
    }
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
          <div style={{ background: "#fafafa", borderRadius: "12px", border: "1px solid #eee", padding: "15px" }}>
            {history.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.85rem" }}>
                {history.map((h, i) => (
                  <li key={h.id || i} style={{ padding: "12px 0", borderBottom: i === history.length - 1 ? "none" : "1px solid #eee" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#888", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.8rem" }}>{format(h.createdAt, 'yyyy/MM/dd HH:mm')}</span>
                      <span style={{ 
                        fontWeight: "bold", 
                        padding: "2px 8px", 
                        borderRadius: "10px", 
                        background: h.status === 'approved' ? '#e8f5e9' : h.status === 'rejected' ? '#ffebee' : '#f5f5f5',
                        color: h.status === 'approved' ? '#2e7d32' : h.status === 'rejected' ? '#c62828' : '#666'
                      }}>
                        {getHistoryLabel(h.type)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "600" }}>{h.actorName}</span>
                      <span style={{ 
                        color: h.status === 'approved' ? '#4caf50' : h.status === 'rejected' ? '#f44336' : '#999',
                        fontWeight: "bold"
                      }}>
                        {h.status === 'approved' ? '承認' : h.status === 'rejected' ? '否認' : '審査待ち'}
                      </span>
                    </div>
                    {h.comment && (
                      <div style={{ marginTop: "8px", padding: "10px", background: "#fff", borderRadius: "8px", border: "1px solid #eee", color: "#333", lineHeight: "1.4" }}>
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

        <FormField label="申請者">
          <div className="label-value" style={{ fontWeight: "bold" }}>{applicantName}</div>
        </FormField>

        <FormField label="種別">
          <div className="label-value">{initialData.type === "expenditure" ? "支出" : "収入"} / {initialData.category}</div>
        </FormField>

        {initialData.isTravel && (
          <FormField label="旅費詳細">
            <div className="label-value" style={{ background: "#f8f9fa", padding: "10px", borderRadius: "8px" }}>
              <div style={{ color: "#666", fontSize: "0.8rem" }}>出発地</div>
              <div style={{ fontWeight: "bold" }}>{getPointName(initialData.departurePrefectureId, initialData.departureMunicipalityId)}</div>
              <div style={{ textAlign: "center", margin: "4px 0" }}><i className="fas fa-arrow-down" style={{ color: "#ccc" }}></i></div>
              <div style={{ color: "#666", fontSize: "0.8rem" }}>到着地</div>
              <div style={{ fontWeight: "bold" }}>{getPointName(initialData.arrivalPrefectureId, initialData.arrivalMunicipalityId)}</div>
            </div>
          </FormField>
        )}

        <FormField label="経費名">
          <div className="label-value">{initialData.name}</div>
        </FormField>

        <FormField label="金額 (税込)">
          <div className="label-value" style={{ fontSize: "1.8rem", fontWeight: "900", color: initialData.type === "expenditure" ? "#c62828" : "#2e7d32" }}>
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
          <h4 style={{ textAlign: "center", fontSize: "0.9rem", color: "#888", marginBottom: "20px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>審査アクション</h4>
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
