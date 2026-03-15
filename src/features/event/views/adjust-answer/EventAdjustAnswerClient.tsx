"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Event, EventAdjustStatus } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { AnswerEditLayout } from "@/src/components/Layout/AnswerEditLayout";
import { getDayOfWeek, showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import { submitAdjustAnswer } from "@/src/features/event/api/event-client-service";
import { db } from "@/src/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Props = {
  eventId: string;
  event: Event;
  adjustStatuses: EventAdjustStatus[];
};

export function EventAdjustAnswerClient({ eventId, event, adjustStatuses }: Props) {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.id;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const candidateDates = event.candidateDates || [];

  useEffect(() => {
    if (!uid) return;
    const fetch = async () => {
      const snap = await getDoc(doc(db, "eventAdjustAnswers", `${eventId}_${uid}`));
      if (snap.exists()) {
        setAnswers(snap.data().answers || {});
        setIsEdit(true);
      }
      setIsLoading(false);
    };
    fetch();
  }, [uid, eventId]);

  const handleChange = (date: string, statusId: string) => {
    setAnswers(prev => ({ ...prev, [date]: statusId }));
  };

  const handleSave = async () => {
    if (!uid) return;

    const unanswered = candidateDates.filter(d => !answers[d]);
    if (unanswered.length > 0) {
      await showDialog("すべての候補日に回答してください", true);
      return;
    }

    const confirmed = await showDialog(`回答を${isEdit ? "修正" : "登録"}しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      await submitAdjustAnswer(eventId, uid, answers);
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
          <label className="label-title">タイトル</label>
          <div className="label-value">{event.title}</div>
        </div>

        <div className="form-group">
          <label>日程調整回答</label>
          <div className="adjust-table" style={{ marginTop: "10px" }}>
            {/* ヘッダー */}
            <div className="adjust-row header-row">
              <div className="date-cell">日付<br />(曜日)</div>
              {adjustStatuses.map(status => (
                <div key={status.id} className="status-cell">{status.name}</div>
              ))}
            </div>
            {/* 各候補日の行 */}
            {candidateDates.map(date => {
              const parts = date.split(".");
              const monthDay = parts.length === 3 ? `${parts[1]}/${parts[2]}` : date;
              const dayStr = getDayOfWeek(date, true);
              const selected = answers[date] || "";

              return (
                <div key={date} className={`adjust-row${selected ? " selected-row" : ""}`}>
                  <div className="date-cell">
                    <span className="date-part">{monthDay}</span>
                    <span className="day-part">({dayStr})</span>
                  </div>
                  {adjustStatuses.map(status => {
                    const radioId = `${date}_${status.id}`;
                    const isSelected = selected === status.id;
                    return (
                      <div key={status.id} className={`status-cell${isSelected ? " selected-cell" : ""}`}>
                        <input
                          type="radio"
                          id={radioId}
                          name={`adjust-${date}`}
                          value={status.id}
                          checked={isSelected}
                          onChange={() => handleChange(date, status.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </AnswerEditLayout>
    </BaseLayout>
  );
}
