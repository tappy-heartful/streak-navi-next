"use client";

import React from "react";
import { ExpenseApplyHistory } from "@/src/lib/firestore/types";
import { format } from "@/src/lib/functions";

type Props = {
  history: ExpenseApplyHistory[];
};

const isApplicantType = (type: string) => type === 'created' || type === 'updated';

const APPLICANT_COLOR = "#42a5f5";  // 申請者: 明るい青
const REVIEWER_COLOR  = "#ba68c8";  // 審査者: 明るい紫

/**
 * Common Component to display Expense Application and Review history
 * with timeline styling.
 */
export function ExpenseHistoryList({ history }: Props) {
  const getHistoryLabel = (type: string) => {
    switch (type) {
      case 'created': return '申請作成';
      case 'updated': return '再申請/修正';
      case 'reviewed': return '審査実施';
      case 'commented': return 'コメント追加';
      default: return type;
    }
  };

  if (history.length === 0) {
    return (
      <div style={{
        color: "#999",
        textAlign: "center",
        fontSize: "0.85rem",
        padding: "20px",
        background: "#fafafa",
        borderRadius: "12px",
        border: "1px dashed #eee"
      }}>
        履歴はありません
      </div>
    );
  }

  return (
    <div style={{ position: "relative", padding: "10px 0" }}>
      {/* Timeline line */}
      <div style={{
        position: "absolute",
        left: "15px",
        top: "10px",
        bottom: "10px",
        width: "2px",
        background: "#e0e0e0"
      }}></div>

      {history.map((h, i) => {
        const applicant = isApplicantType(h.type);
        const accentColor = applicant ? APPLICANT_COLOR : REVIEWER_COLOR;
        const bgColor     = applicant ? "#f0f7ff" : "#faf0ff";
        const roleLabel   = applicant ? "申請者" : "審査者";
        const roleIcon    = applicant ? "fa-solid fa-user" : "fa-solid fa-user-tie";

        return (
          <div key={h.id || i} style={{ position: "relative", paddingLeft: "45px", marginBottom: "25px" }}>
            {/* Circle with actor-role color */}
            <div style={{
               position: "absolute",
               left: "0",
               top: "0",
               width: "32px",
               height: "32px",
               borderRadius: "50%",
               background: accentColor,
               display: "flex",
               alignItems: "center",
               justifyContent: "center",
               fontSize: "0.75rem",
               fontWeight: "bold",
               color: "#fff",
               zIndex: 1,
               boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
            }}>
              {i + 1}
            </div>

            <div style={{
              background: bgColor,
              borderRadius: "12px",
              border: `1px solid ${accentColor}33`,
              borderLeft: `4px solid ${accentColor}`,
              padding: "14px 16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
            }}>
              {/* Role badge row */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  padding: "2px 8px",
                  borderRadius: "20px",
                  background: accentColor,
                  color: "#fff",
                }}>
                  <i className={roleIcon} style={{ fontSize: "0.65rem" }} />
                  {roleLabel}
                </span>
                <span style={{
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: "#fff",
                  color: accentColor,
                  border: `1px solid ${accentColor}55`,
                }}>
                  {getHistoryLabel(h.type)}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#333" }}>
                  {h.actorName}
                </div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  color: h.status === 'approved' ? '#4caf50' : h.status === 'returned' ? '#f57c00' : '#ffa000'
                }}>
                  {h.status === 'approved' ? '✓ 承認' : h.status === 'returned' ? '⚠ 差し戻し' : '⏳ 審査待ち'}
                </span>
              </div>

              <div style={{ fontSize: "0.8rem", color: "#888" }}>
                {format(h.createdAt, 'yyyy/MM/dd HH:mm')}
              </div>

              {h.comment && (
                <div style={{
                  marginTop: "10px",
                  padding: "10px",
                  background: "#fff",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  color: "#555",
                  borderLeft: `4px solid ${accentColor}88`,
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.5"
                }}>
                  {h.comment}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
