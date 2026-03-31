"use client";

import React from "react";
import { Notice } from "@/src/lib/firestore/types";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";

const RELATED_TYPE_LABELS: Record<string, string> = {
  none: "紐づけなし",
  events: "イベント",
  votes: "投票",
  calls: "曲募集",
};

type Props = {
  notice: Notice;
};

export function NoticeConfirmClient({ notice }: Props) {
  const relatedTypeLabel = RELATED_TYPE_LABELS[notice.relatedType] ?? notice.relatedType;
  const relatedDisplay =
    notice.relatedId && notice.relatedType !== "none"
      ? `${relatedTypeLabel}：${notice.relatedTitle || notice.relatedId}`
      : "紐づけなし";

  return (
    <BaseLayout>
      <ConfirmLayout
        name="カスタム通知"
        icon="fa-solid fa-bell"
        basePath="/notice"
        dataId={notice.id}
        featureIdKey="noticeId"
        collectionName="notices"
        hideCopy={false}
      >
        <DisplayField label="紐づけ対象">{relatedDisplay}</DisplayField>

        <div className="form-group">
          <label className="label-title">通知スケジュール</label>
          {notice.schedules && notice.schedules.length > 0 ? (
            notice.schedules.map((schedule, i) => (
              <div
                key={i}
                style={{
                  background: "#f9f9f9",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "12px",
                  border: "1px solid #eee",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                  通知日: {schedule.scheduledDate || "----"}
                </div>
                {schedule.notifications?.map((n, j) => (
                  <div
                    key={j}
                    style={{
                      marginBottom: "8px",
                      paddingLeft: "12px",
                      borderLeft: "3px solid #4CAF50",
                    }}
                  >
                    <span style={{ fontWeight: "bold", color: "#333" }}>{n.scheduledTime}</span>
                    <p style={{ margin: "4px 0 0", color: "#555", whiteSpace: "pre-wrap", fontSize: "14px" }}>
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            ))
          ) : (
            <p className="label-value" style={{ color: "#999" }}>通知スケジュールが設定されていません</p>
          )}
        </div>
      </ConfirmLayout>
    </BaseLayout>
  );
}
