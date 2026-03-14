"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Event, AttendanceStatus } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { AnswerEditLayout } from "@/src/components/Layout/AnswerEditLayout";
import { getDayOfWeek, showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import { submitAttendanceAnswer } from "@/src/features/event/api/event-client-service";
import { db } from "@/src/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Props = {
  eventId: string;
  event: Event;
  attendanceStatuses: AttendanceStatus[];
};

export function EventAttendanceAnswerClient({ eventId, event, attendanceStatuses }: Props) {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.id;

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const fetch = async () => {
      const snap = await getDoc(doc(db, "eventAttendanceAnswers", `${eventId}_${uid}`));
      if (snap.exists()) {
        setSelectedStatus(snap.data().status || "");
        setIsEdit(true);
      }
      setIsLoading(false);
    };
    fetch();
  }, [uid, eventId]);

  const handleSave = async () => {
    if (!uid) return;
    if (!selectedStatus) {
      await showDialog("出欠を選択してください", true);
      return;
    }
    const confirmed = await showDialog(`回答を${isEdit ? "修正" : "登録"}しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      await submitAttendanceAnswer(eventId, uid, selectedStatus);
      hideSpinner();
      await showDialog(`回答を${isEdit ? "修正" : "登録"}しました`, true);
      showSpinner();
      router.push(`/event/confirm?eventId=${eventId}`);
    } catch {
      hideSpinner();
      await showDialog("登録に失敗しました", true);
    }
  };

  return (
    <BaseLayout>
      <AnswerEditLayout
        featureName="イベント"
        basePath="/event"
        featureIdKey="eventId"
        dataId={eventId}
        mode={isEdit ? "edit" : "new"}
        onSave={handleSave}
        isLoading={isLoading}
      >
        <div className="form-group">
          <label className="label-title">日付</label>
          <div className="label-value">
            {event.date ? getDayOfWeek(event.date) : "未設定"}
          </div>
        </div>

        <div className="form-group">
          <label className="label-title">タイトル</label>
          <div className="label-value">{event.title}</div>
        </div>

        <div className="form-group">
          <label>出欠回答</label>
          <div>
            {attendanceStatuses.map(status => {
              const radioId = `status-${status.id}`;
              return (
                <label key={status.id} style={{ display: "block", marginBottom: "8px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    id={radioId}
                    name="attendance-status"
                    value={status.id}
                    checked={selectedStatus === status.id}
                    onChange={() => setSelectedStatus(status.id)}
                    style={{ marginRight: "8px" }}
                  />
                  {status.name}
                </label>
              );
            })}
          </div>
        </div>
      </AnswerEditLayout>
    </BaseLayout>
  );
}
