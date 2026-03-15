"use client";

import React, { useEffect, useState, useCallback } from "react";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { FormField } from "@/src/components/Form/FormField";
import { Notice } from "@/src/lib/firestore/types";
import { useAppForm } from "@/src/hooks/useAppForm";
import { saveNotice, NoticeFormData, NoticeScheduleItemInput } from "@/src/features/notice/api/notice-client-service";
import { dotDateToHyphen, getDayOfWeek } from "@/src/lib/functions";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

const RELATED_TYPE_OPTIONS = [
  { value: "none", label: "紐づけなし" },
  { value: "events", label: "イベント" },
  { value: "votes", label: "投票" },
  { value: "calls", label: "曲募集" },
];

type RelatedItem = { id: string; label: string; date?: string };

type Props = {
  mode: "new" | "edit" | "copy";
  noticeId?: string;
  initialNotice: Notice | null;
};

export function NoticeEditClient({ mode, noticeId, initialNotice }: Props) {
  const schedule = initialNotice?.schedules?.[0];

  const form = useAppForm<NoticeFormData>(
    {
      relatedType: initialNotice?.relatedType ?? "none",
      relatedId: initialNotice?.relatedId ?? "",
      relatedTitle: initialNotice?.relatedTitle ?? "",
      scheduledDate: schedule?.scheduledDate ? dotDateToHyphen(schedule.scheduledDate) : "",
      notifications: schedule?.notifications && schedule.notifications.length > 0
        ? schedule.notifications
        : [{ scheduledTime: "09:00", message: "" }],
    },
    {
      scheduledDate: [(v: string) => !!v || "通知日は必須です"],
    }
  );

  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // relatedType が変わったとき関連データを取得
  const fetchRelatedItems = useCallback(async (type: string) => {
    if (type === "none") {
      setRelatedItems([]);
      return;
    }
    setLoadingRelated(true);
    try {
      const snap = await getDocs(collection(db, type));
      const items: RelatedItem[] = snap.docs.map(d => {
        const data = d.data();
        const label = data.title || data.name || "名称未設定";
        const date = data.date as string | undefined;
        return { id: d.id, label: date ? `${date} ${label}` : label, date };
      });
      if (type === "events") {
        items.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
      }
      setRelatedItems(items);
    } finally {
      setLoadingRelated(false);
    }
  }, []);

  useEffect(() => {
    if (initialNotice?.relatedType && initialNotice.relatedType !== "none") {
      fetchRelatedItems(initialNotice.relatedType);
    }
  }, [initialNotice?.relatedType, fetchRelatedItems]);

  const handleRelatedTypeChange = (type: string) => {
    form.updateField("relatedType", type);
    form.updateField("relatedId", "");
    form.updateField("relatedTitle", "");
    fetchRelatedItems(type);
  };

  const handleRelatedIdChange = async (id: string) => {
    form.updateField("relatedId", id);
    // タイトルを更新
    const found = relatedItems.find(i => i.id === id);
    form.updateField("relatedTitle", found?.label ?? "");
    // イベントの場合は日付を自動セット
    if (form.formData.relatedType === "events" && id) {
      try {
        const snap = await getDoc(doc(db, "events", id));
        const date = snap.data()?.date as string | undefined;
        if (date) form.updateField("scheduledDate", dotDateToHyphen(date));
      } catch {
        // 無視
      }
    }
  };

  // Notifications ヘルパー
  const addNotification = () => {
    const last = form.formData.notifications.at(-1);
    const nextTime = last?.scheduledTime ?? "09:00";
    form.updateField("notifications", [
      ...form.formData.notifications,
      { scheduledTime: nextTime, message: "" },
    ]);
  };

  const removeNotification = (idx: number) => {
    const updated = form.formData.notifications.filter((_, i) => i !== idx);
    form.updateField("notifications", updated.length > 0 ? updated : [{ scheduledTime: "09:00", message: "" }]);
  };

  const updateNotification = (idx: number, field: keyof NoticeScheduleItemInput, value: string) => {
    form.updateField(
      "notifications",
      form.formData.notifications.map((n, i) => (i === idx ? { ...n, [field]: value } : n))
    );
  };

  const onSaveApi = async (data: NoticeFormData): Promise<string> => {
    if (!data.scheduledDate) throw new Error("validation:通知日は必須です");
    const valid = data.notifications.filter(n => n.scheduledTime && n.message);
    if (valid.length === 0) throw new Error("validation:時刻とメッセージを少なくとも1つ入力してください");
    return saveNotice(mode, data, noticeId);
  };

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="カスタム通知"
        featureIdKey="noticeId"
        basePath="/notice"
        dataId={noticeId}
        mode={mode}
        form={form}
        onSaveApi={onSaveApi}
      >
        {/* 紐づけ対象 */}
        <FormField label="紐づけ対象（通知メッセージにリンクを表示します）">
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <select
              className="form-control"
              value={form.formData.relatedType}
              onChange={e => handleRelatedTypeChange(e.target.value)}
            >
              {RELATED_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {form.formData.relatedType !== "none" && (
              <select
                className="form-control"
                value={form.formData.relatedId}
                onChange={e => handleRelatedIdChange(e.target.value)}
                disabled={loadingRelated}
              >
                <option value="">対象を選択してください</option>
                {relatedItems.map(item => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            )}
          </div>
        </FormField>

        {/* 通知日 */}
        <FormField label="通知日" required error={form.errors.scheduledDate}>
          <input
            type="date"
            className="form-control"
            value={form.formData.scheduledDate}
            onChange={e => form.updateField("scheduledDate", e.target.value)}
          />
        </FormField>

        {/* 時刻とメッセージ */}
        <FormField label="通知時刻・メッセージ" required>
          {form.formData.notifications.map((n, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px",
                background: "#fafafa",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="time"
                  className="form-control"
                  value={n.scheduledTime}
                  onChange={e => updateNotification(idx, "scheduledTime", e.target.value)}
                  style={{ width: "120px" }}
                />
                {form.formData.notifications.length > 1 && (
                  <button
                    type="button"
                    className="remove-choice"
                    onClick={() => removeNotification(idx)}
                  >
                    削除
                  </button>
                )}
              </div>
              <textarea
                className="form-control"
                rows={4}
                placeholder="通知メッセージ..."
                value={n.message}
                onChange={e => updateNotification(idx, "message", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          ))}
          <button type="button" className="add-choice" onClick={addNotification}>
            ＋ 時刻・メッセージを追加
          </button>
        </FormField>
      </EditFormLayout>
    </BaseLayout>
  );
}
