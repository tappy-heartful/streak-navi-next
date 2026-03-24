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
          <div style={{ padding: "10px 0" }}>
            {history.length > 0 ? (
              <div style={{ position: "relative" }}>
                {/* タイムラインの縦線 */}
                <div style={{ position: "absolute", left: "15px", top: "10px", bottom: "10px", width: "2px", background: "#e0e0e0" }}></div>
                
                {history.map((h, i) => (
                  <div key={h.id || i} style={{ position: "relative", paddingLeft: "45px", marginBottom: "25px" }}>
                    {/* 番号付きの円 */}
                    <div style={{ 
                      position: "absolute", left: "0", top: "0", width: "32px", height: "32px", 
                      borderRadius: "50%", background: "#fff", border: `2px solid ${h.status === 'approved' ? '#4caf50' : h.status === 'rejected' ? '#f44336' : '#2196f3'}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "bold", zIndex: 1
                    }}>
                      {i + 1}
                    </div>

                    <div style={{ 
                      background: "#fff", borderRadius: "12px", border: "1px solid #eee", padding: "12px", 
                      boxShadow: "0 2px 6px rgba(0,0,0,0.02)" 
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div>
                          <span style={{ 
                            fontSize: "0.7rem", fontWeight: "bold", padding: "2px 8px", borderRadius: "4px", 
                            background: h.type === 'created' ? '#e3f2fd' : h.type === 'reviewed' ? '#f3e5f5' : '#f5f5f5',
                            color: h.type === 'created' ? '#1976d2' : h.type === 'reviewed' ? '#7b1fa2' : '#666',
                            marginRight: "8px", textTransform: "uppercase"
                          }}>
                            {getHistoryLabel(h.type)}
                          </span>
                          <span style={{ fontSize: "0.8rem", color: "#888" }}>{format(h.createdAt, 'yyyy/MM/dd HH:mm')}</span>
                        </div>
                        <span style={{ 
                          fontSize: "0.75rem", fontWeight: "bold",
                          color: h.status === 'approved' ? '#4caf50' : h.status === 'rejected' ? '#f44336' : '#ffa000'
                        }}>
                          {h.status === 'approved' ? '承認済' : h.status === 'rejected' ? '否認済' : '審査待'}
                        </span>
                      </div>
                      
                      <div style={{ fontWeight: "bold", fontSize: "0.9rem", color: "#333" }}>{h.actorName}</div>
                      
                      {h.comment && (
                        <div style={{ 
                          marginTop: "10px", padding: "10px", background: "#f8f9fa", borderRadius: "8px", 
                          fontSize: "0.85rem", color: "#555", borderLeft: "4px solid #dee2e6",
                          whiteSpace: "pre-wrap", lineHeight: "1.5"
                        }}>
                          {h.comment}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#999", textAlign: "center", fontSize: "0.8rem", padding: "20px", background: "#fafafa", borderRadius: "12px" }}>
                履歴はありません
              </div>
            )}
          </div>
        </FormField>

        <FormField label="申請者">
          <div className="label-value" style={{ fontWeight: "bold" }}>{applicantName}</div>
        </FormField>

        <FormField label="種別">
          <div className="label-value">{typeNamesMap[initialData.typeId] || "不明"} / {initialData.category}</div>
        </FormField>

        {initialData.isTravel && (
          <FormField label="旅費詳細">
            <div className="label-value" style={{ background: "#f1f8ff", padding: "12px", borderRadius: "10px", border: "1px solid #e3f2fd" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                   <div style={{ color: "#1976d2", fontSize: "0.7rem", fontWeight: "bold" }}>出発</div>
                   <div style={{ fontWeight: "bold", fontSize: "1rem" }}>{getPointName(initialData.departurePrefectureId, initialData.departureMunicipalityId)}</div>
                </div>

                <div style={{ textAlign: "center", minWidth: "60px" }}>
                  <div style={{ color: "#1976d2", fontSize: "0.7rem", fontWeight: "bold" }}>往復</div>
                  <i className="fas fa-exchange-alt" style={{ color: "#1976d2", fontSize: "1.1rem" }}></i>
                </div>

                <div style={{ flex: 1, textAlign: "center" }}>
                   <div style={{ color: "#1976d2", fontSize: "0.7rem", fontWeight: "bold" }}>到着</div>
                   <div style={{ fontWeight: "bold", fontSize: "1rem" }}>{getPointName(initialData.arrivalPrefectureId, initialData.arrivalMunicipalityId)}</div>
                </div>
              </div>
              
              <div style={{ marginTop: "15px", borderRadius: "10px", overflow: "hidden", border: "1px solid #e0e0e0", height: "220px" }}>
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?saddr=${encodeURIComponent(getPointName(initialData.departurePrefectureId, initialData.departureMunicipalityId))}&daddr=${encodeURIComponent(getPointName(initialData.arrivalPrefectureId, initialData.arrivalMunicipalityId))}&dirflg=r&output=embed`}
                ></iframe>
              </div>
            </div>
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
