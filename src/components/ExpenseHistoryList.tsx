"use client";

import React from "react";
import { ExpenseApplyHistory } from "@/src/lib/firestore/types";
import { format } from "@/src/lib/functions";

type Props = {
  history: ExpenseApplyHistory[];
};

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
      
      {history.map((h, i) => (
        <div key={h.id || i} style={{ position: "relative", paddingLeft: "45px", marginBottom: "25px" }}>
          {/* Numbered circle with dynamic border color based on status */}
          <div style={{ 
             position: "absolute", 
             left: "0", 
             top: "0", 
             width: "32px", 
             height: "32px", 
             borderRadius: "50%", 
             background: "#fff", 
             border: `2px solid ${h.status === 'approved' ? '#4caf50' : h.status === 'rejected' ? '#f44336' : '#2196f3'}`,
             display: "flex", 
             alignItems: "center", 
             justifyContent: "center", 
             fontSize: "0.8rem", 
             fontWeight: "bold", 
             zIndex: 1,
             boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            {i + 1}
          </div>

          <div style={{ 
            background: "#fff", 
            borderRadius: "12px", 
            border: "1px solid #eee", 
            padding: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div>
                <span style={{ 
                  fontSize: "0.7rem", 
                  fontWeight: "bold", 
                  padding: "2px 8px", 
                  borderRadius: "4px", 
                  background: h.type === 'created' ? '#e3f2fd' : h.type === 'reviewed' ? '#f3e5f5' : '#f5f5f5',
                  color: h.type === 'created' ? '#1976d2' : h.type === 'reviewed' ? '#7b1fa2' : '#666',
                  marginRight: "8px",
                  textTransform: "uppercase"
                }}>
                  {getHistoryLabel(h.type)}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#888" }}>{format(h.createdAt, 'yyyy/MM/dd HH:mm')}</span>
              </div>
              <span style={{ 
                fontSize: "0.75rem", 
                fontWeight: "bold",
                color: h.status === 'approved' ? '#4caf50' : h.status === 'rejected' ? '#f44336' : '#ffa000'
              }}>
                {h.status === 'approved' ? '承認' : h.status === 'rejected' ? '否認' : '審査待'}
              </span>
            </div>
            
            <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#333" }}>{h.actorName}</div>
            
            {h.comment && (
              <div style={{ 
                marginTop: "10px", 
                padding: "10px", 
                background: "#f8f9fa", 
                borderRadius: "8px", 
                fontSize: "0.85rem", 
                color: "#555", 
                borderLeft: "4px solid #dee2e6",
                whiteSpace: "pre-wrap",
                lineHeight: "1.5"
              }}>
                {h.comment}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
