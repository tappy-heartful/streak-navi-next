"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { NoticeBaseData } from "@/src/features/notice/api/notice-server-actions";
import { NoticeBaseNotification } from "@/src/lib/firestore/types";
import { FormFooter } from "@/src/components/Form/FormFooter";

const CONFIG_KEYS: { key: string; label: string }[] = [
  { key: "eventStart",    label: "📅 イベント出欠（受付開始）" },
  { key: "eventEnd",      label: "📅 イベント出欠（受付終了）" },
  { key: "eventAdjStart", label: "🗓️ 日程調整（受付開始）" },
  { key: "eventAdjEnd",   label: "🗓️ 日程調整（受付終了）" },
  { key: "collectStart",  label: "💰 集金（受付開始）" },
  { key: "collectEnd",    label: "💰 集金（受付終了）" },
  { key: "collectRemind", label: "📣 集金（催促）" },
  { key: "voteStart",     label: "🗳️ 投票（受付開始）" },
  { key: "voteEnd",       label: "🗳️ 投票（受付終了）" },
  { key: "callStart",     label: "🎶 曲募集（受付開始）" },
  { key: "callEnd",       label: "🎶 曲募集（受付終了）" },
];

function formatTiming(key: string, n: NoticeBaseNotification): string {
  const dateLabel = key.endsWith("Start") ? "受付開始日" : "受付終了日";
  const ba = n.beforeAfter === "after" ? "後" : "前";
  const time = "9:00ごろ";
  if (n.interval) {
    return `${dateLabel}の ${n.days} 日${ba}から ${n.interval} 日おき ${time}`;
  }
  if (n.days === 0) return `${dateLabel}の当日 ${time}`;
  return `${dateLabel}の ${n.days} 日${ba}の ${time}`;
}

type Props = {
  noticeBase: NoticeBaseData;
};

export function NoticeAutoConfirmClient({ noticeBase }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const { isAdmin } = useAuth();

  useEffect(() => {
    setBreadcrumbs([
      { title: "通知設定一覧", href: "/notice" },
      { title: "自動通知設定確認" },
    ]);
  }, [setBreadcrumbs]);

  return (
    <BaseLayout>
      <div className="page-header">
        <h1>自動通知設定確認</h1>
      </div>

      <div className="container">
        {CONFIG_KEYS.map(({ key, label }) => {
          const notifications: NoticeBaseNotification[] = noticeBase[`${key}Notifications`] ?? [];
          return (
            <div key={key}>
              <h3 className="menu-title">{label}</h3>
              <div className="form-group">
                {notifications.length > 0 ? (
                  notifications.map((n, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#f9f9f9",
                        borderRadius: "6px",
                        padding: "12px 14px",
                        marginBottom: "10px",
                        border: "1px solid #eee",
                      }}
                    >
                      <label className="label-title">通知タイミング</label>
                      <div className="label-value" style={{ marginBottom: "8px", color: "#2e7d32", fontWeight: "bold" }}>
                        {formatTiming(key, n)}
                      </div>
                      <label className="label-title">通知メッセージ</label>
                      {n.message ? (
                        <div className="label-value" style={{ whiteSpace: "pre-wrap" }}>
                          {n.message}
                        </div>
                      ) : (
                        <div className="label-value" style={{ color: "#aaa" }}>
                          （メッセージ未設定）
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="label-value" style={{ color: "#aaa" }}>
                    通知設定はありません
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isAdmin && (
          <div className="confirm-buttons" style={{ marginTop: "24px" }}>
            <Link href="/notice/auto-edit" className="edit-button" style={{ textDecoration: "none", borderRadius: "8px" }}>
              編集する
            </Link>
          </div>
        )}
      </div>

      <FormFooter backHref="/notice" backText="通知設定一覧" />
    </BaseLayout>
  );
}
