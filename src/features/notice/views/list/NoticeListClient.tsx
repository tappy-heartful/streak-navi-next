"use client";

import React from "react";
import Link from "next/link";
import { Notice } from "@/src/lib/firestore/types";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { useAuth } from "@/src/contexts/AuthContext";

type Props = {
  initialNotices: Notice[];
};

export function NoticeListClient({ initialNotices: _initialNotices }: Props) {
  const { userData } = useAuth();
  const canViewLineLogs = Boolean(userData?.isSystemAdmin || userData?.isLineLogAdmin);

  return (
    <ListBaseLayout title="通知設定" basePath="/notice" icon="fa-solid fa-bell" hideAddButton={true}>
      {/* 自動通知設定 */}
      <div className="container" style={{ marginBottom: "24px" }}>
        <h3><i className="fa-solid fa-robot" style={{ marginRight: "0.5rem" }} />自動通知設定</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li style={{ marginBottom: "12px" }}>
            <Link
              href="/notice/auto-confirm"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
                boxShadow: "1px 1px 5px rgba(0,0,0,0.05)",
                textDecoration: "none",
              }}
            >
              <span style={{ fontWeight: "bold" }}>自動通知設定を見る</span>
              <i className="fa-solid fa-chevron-right" style={{ color: "#aaa" }} />
            </Link>
          </li>
          {canViewLineLogs && (
            <li style={{ marginBottom: "12px" }}>
              <Link
                href="/line-logs"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#f9f9f9",
                  boxShadow: "1px 1px 5px rgba(0,0,0,0.05)",
                  textDecoration: "none",
                }}
              >
                <span style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
                  <i className="fa-solid fa-paper-plane" style={{ color: "#06c755" }} />
                  LINE送信履歴・配信枠状況を見る
                </span>
                <i className="fa-solid fa-chevron-right" style={{ color: "#aaa" }} />
              </Link>
            </li>
          )}
        </ul>
      </div>
    </ListBaseLayout>
  );
}
