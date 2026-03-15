"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useAuth } from "@/src/contexts/AuthContext";
import { NoticeBaseData } from "@/src/features/notice/api/notice-server-actions";
import { NoticeBaseNotification } from "@/src/lib/firestore/types";
import { saveNoticeBase } from "@/src/features/notice/api/notice-client-service";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import { FormFooter } from "@/src/components/Form/FormFooter";
import { FormButtons } from "@/src/components/Form/FormButtons";

const CONFIG_KEYS: { key: string; label: string; isRemind?: boolean }[] = [
  { key: "eventStart",    label: "出欠確認 受付開始日" },
  { key: "eventEnd",      label: "出欠確認 受付終了日" },
  { key: "eventAdjStart", label: "日程調整 受付開始日" },
  { key: "eventAdjEnd",   label: "日程調整 受付終了日" },
  { key: "collectStart",  label: "集金 受付開始日" },
  { key: "collectEnd",    label: "集金 受付終了日" },
  { key: "collectRemind", label: "集金 リマインダー", isRemind: true },
  { key: "voteStart",     label: "投票 受付開始日" },
  { key: "voteEnd",       label: "投票 受付終了日" },
  { key: "callStart",     label: "曲募集 受付開始日" },
  { key: "callEnd",       label: "曲募集 受付終了日" },
];

type NotifState = Record<string, NoticeBaseNotification[]>;

type Props = {
  initialNoticeBase: NoticeBaseData;
};

export function NoticeAutoEditClient({ initialNoticeBase }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  const buildInitialState = (): NotifState => {
    const state: NotifState = {};
    CONFIG_KEYS.forEach(({ key, isRemind }) => {
      const dataKey = `${key}Notifications`;
      state[key] = initialNoticeBase[dataKey] ??
        (isRemind
          ? [{ days: 1, beforeAfter: "after", interval: 14, message: "" }]
          : [{ days: 1, beforeAfter: "before", message: "" }]);
    });
    return state;
  };

  const [notifications, setNotifications] = useState<NotifState>(buildInitialState);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      { title: "通知設定一覧", href: "/notice" },
      { title: "自動通知設定確認", href: "/notice/auto-confirm" },
      { title: "自動通知設定編集" },
    ]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      showDialog("この操作を行う権限がありません。", true).then(() => router.push("/notice"));
      return;
    }
    setIsAuthorized(true);
  }, [loading, isAdmin, router]);

  const addNotification = (key: string, isRemind: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: [
        ...prev[key],
        isRemind
          ? { days: 1, beforeAfter: "after" as const, interval: 14, message: "" }
          : { days: 1, beforeAfter: "before" as const, message: "" },
      ],
    }));
  };

  const removeNotification = (key: string, idx: number) => {
    setNotifications(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx),
    }));
  };

  const updateNotification = (key: string, idx: number, field: keyof NoticeBaseNotification, value: string | number) => {
    setNotifications(prev => ({
      ...prev,
      [key]: prev[key].map((n, i) => i === idx ? { ...n, [field]: value } : n),
    }));
  };

  const handleSave = async () => {
    if (!(await showDialog("設定を保存しますか？"))) return;
    showSpinner();
    try {
      const data: NoticeBaseData = {};
      CONFIG_KEYS.forEach(({ key }) => {
        data[`${key}Notifications`] = notifications[key].filter(n => !isNaN(n.days));
      });
      await saveNoticeBase(data);
      hideSpinner();
      await showDialog("保存しました", true);
      router.push("/notice/auto-confirm");
      router.refresh();
    } catch {
      hideSpinner();
      await showDialog("保存に失敗しました", true);
    }
  };

  const handleReset = () => {
    setNotifications(buildInitialState());
  };

  if (loading || !isAuthorized) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>権限を確認中...</div>;
  }

  return (
    <BaseLayout>
      <div className="page-header">
        <h1>自動通知設定編集</h1>
      </div>

      <div className="container">
        {CONFIG_KEYS.map(({ key, label, isRemind }) => (
          <div
            key={key}
            className="form-group"
            style={{
              background: "#f9f9f9",
              borderRadius: "8px",
              padding: "14px 16px",
              marginBottom: "16px",
              border: "1px solid #eee",
            }}
          >
            <label className="label-title" style={{ marginBottom: "10px", display: "block", fontWeight: "bold" }}>
              {label}
            </label>

            {notifications[key].map((n, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#fff",
                    borderRadius: "6px",
                    padding: "12px",
                    marginBottom: "10px",
                    border: "1px solid #ddd",
                    position: "relative"
                  }}
                >
                  <button
                    type="button"
                    className="remove-choice"
                    onClick={() => removeNotification(key, idx)}
                    style={{ position: "absolute", top: "10px", right: "10px" }}
                  >
                    削除
                  </button>

                  {/* タイミング設定 */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "8px", paddingRight: "50px" }}>
                    <span style={{ fontSize: "13px", color: "#555" }}>
                      {isRemind ? "受付終了日の" : "日付の"}
                    </span>
                    <input
                      type="number"
                      className="form-control"
                      value={n.days}
                      min={0}
                      onChange={e => updateNotification(key, idx, "days", parseInt(e.target.value) || 0)}
                      style={{ width: "64px" }}
                    />
                    <span style={{ fontSize: "13px", color: "#555" }}>日</span>
                    <select
                      className="form-control"
                      value={n.beforeAfter}
                      onChange={e => updateNotification(key, idx, "beforeAfter", e.target.value)}
                      style={{ width: "80px" }}
                    >
                      <option value="before">前</option>
                      <option value="after">後</option>
                    </select>
                    {isRemind && (
                      <>
                        <span style={{ fontSize: "13px", color: "#555" }}>から</span>
                        <input
                          type="number"
                          className="form-control"
                          value={n.interval ?? 14}
                          min={1}
                          onChange={e => updateNotification(key, idx, "interval", parseInt(e.target.value) || 14)}
                          style={{ width: "64px" }}
                        />
                        <span style={{ fontSize: "13px", color: "#555" }}>日ごと</span>
                      </>
                    )}
                    <span style={{ fontSize: "13px", color: "#555" }}>9:00ごろ</span>
                  </div>

                  {/* メッセージ */}
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="通知メッセージ..."
                    value={n.message}
                    onChange={e => updateNotification(key, idx, "message", e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
            ))}

            <button
              type="button"
              className="add-choice"
              onClick={() => addNotification(key, !!isRemind)}
            >
              ＋ 通知を追加
            </button>
          </div>
        ))}

        <FormButtons mode="edit" onSave={handleSave} onClear={handleReset} />
      </div>

      <FormFooter backHref="/notice/auto-confirm" backText="自動通知設定確認" />
    </BaseLayout>
  );
}
