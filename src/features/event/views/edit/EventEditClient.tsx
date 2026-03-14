"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { FormFooter } from "@/src/components/Form/FormFooter";
import { Event, Score, Section, SetlistGroup, InstrumentPart } from "@/src/lib/firestore/types";
import { addEvent, updateEvent } from "@/src/features/event/api/event-client-service";
import { showDialog, showSpinner, hideSpinner, dotDateToHyphen, hyphenDateToDot } from "@/src/lib/functions";

type Props = {
  mode: "new" | "edit" | "copy";
  eventId?: string;
  initialEvent?: Event | null;
  initialType: "schedule" | "attendance";
  scores: Score[];
  sections: Section[];
};

type SetlistGroupState = {
  title: string;
  songIds: string[];
};

type InstrumentSectionState = {
  sectionId: string;
  parts: InstrumentPartState[];
};

type InstrumentPartState = {
  partName: string;
  instrumentId: string;
};

function defaultDates() {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date();
  end.setDate(end.getDate() + 13);
  return { start: fmt(start), end: fmt(end) };
}

export function EventEditClient({ mode, eventId, initialEvent, initialType, scores, sections }: Props) {
  const router = useRouter();
  const { userData, isAdmin, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const isEdit = mode === "edit";
  const { start: defaultStart, end: defaultEnd } = defaultDates();

  const [attendanceType, setAttendanceType] = useState<"schedule" | "attendance">(
    initialEvent?.attendanceType || initialType
  );
  const [date, setDate] = useState(dotDateToHyphen(initialEvent?.date || ""));
  const [candidateDates, setCandidateDates] = useState<string[]>(
    initialEvent?.candidateDates?.map(dotDateToHyphen) || [""]
  );
  const [acceptStartDate, setAcceptStartDate] = useState(
    isEdit
      ? dotDateToHyphen(initialEvent?.acceptStartDate || "")
      : defaultStart
  );
  const [acceptEndDate, setAcceptEndDate] = useState(
    isEdit
      ? dotDateToHyphen(initialEvent?.acceptEndDate || "")
      : defaultEnd
  );
  const [title, setTitle] = useState(
    (initialEvent?.title || "") + (mode === "copy" ? "（コピー）" : "")
  );
  const [placeName, setPlaceName] = useState(initialEvent?.placeName || "");
  const [website, setWebsite] = useState(initialEvent?.website || "");
  const [access, setAccess] = useState(initialEvent?.access || "");
  const [googleMap, setGoogleMap] = useState(initialEvent?.googleMap || "");
  const [schedule, setSchedule] = useState(initialEvent?.schedule || "");
  const [dress, setDress] = useState(initialEvent?.dress || "");
  const [bring, setBring] = useState(initialEvent?.bring || "");
  const [rent, setRent] = useState(initialEvent?.rent || "");
  const [other, setOther] = useState(initialEvent?.other || "");
  const [allowAssign, setAllowAssign] = useState(initialEvent?.allowAssign ?? false);

  const [setlistGroups, setSetlistGroups] = useState<SetlistGroupState[]>(
    initialEvent?.setlist?.map(g => ({ title: g.title, songIds: g.songIds || [] })) ||
    [{ title: "", songIds: [] }]
  );

  // Instrument config: one entry per section
  const initInstrumentConfig = () =>
    sections.map(sec => {
      const parts = initialEvent?.instrumentConfig?.[sec.id] || [];
      return {
        sectionId: sec.id,
        parts: parts.length > 0
          ? parts.map(p => ({ partName: p.partName, instrumentId: p.instrumentId || "" }))
          : [{ partName: "", instrumentId: "" }],
      };
    });

  const [instrumentConfig, setInstrumentConfig] = useState<InstrumentSectionState[]>(initInstrumentConfig);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      showDialog("この操作を行う権限がありません。", true).then(() => router.push("/event"));
      return;
    }
    const crumbs = [{ title: "イベント一覧", href: "/event" }];
    if (isEdit || mode === "copy") {
      crumbs.push({ title: "イベント確認", href: `/event/confirm?eventId=${eventId}` });
    }
    crumbs.push({ title: isEdit ? "イベント編集" : "イベント新規作成", href: "" });
    setBreadcrumbs(crumbs);
  }, [loading, isAdmin]);

  // ---- Setlist helpers ----

  const addSetlistGroup = () => {
    setSetlistGroups(prev => [...prev, { title: "", songIds: [] }]);
  };

  const removeSetlistGroup = (idx: number) => {
    setSetlistGroups(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSetlistGroupTitle = (idx: number, title: string) => {
    setSetlistGroups(prev => prev.map((g, i) => i === idx ? { ...g, title } : g));
  };

  const addSongToGroup = (groupIdx: number) => {
    setSetlistGroups(prev => prev.map((g, i) =>
      i === groupIdx ? { ...g, songIds: [...g.songIds, ""] } : g
    ));
  };

  const removeSongFromGroup = (groupIdx: number, songIdx: number) => {
    setSetlistGroups(prev => prev.map((g, i) =>
      i === groupIdx ? { ...g, songIds: g.songIds.filter((_, j) => j !== songIdx) } : g
    ));
  };

  const updateSongInGroup = (groupIdx: number, songIdx: number, scoreId: string) => {
    setSetlistGroups(prev => prev.map((g, i) =>
      i === groupIdx
        ? { ...g, songIds: g.songIds.map((s, j) => j === songIdx ? scoreId : s) }
        : g
    ));
  };

  // ---- Candidate dates helpers ----

  const addCandidateDate = () => {
    setCandidateDates(prev => [...prev, ""]);
  };

  const removeCandidateDate = (idx: number) => {
    setCandidateDates(prev => prev.filter((_, i) => i !== idx));
  };

  const updateCandidateDate = (idx: number, val: string) => {
    setCandidateDates(prev => prev.map((d, i) => i === idx ? val : d));
  };

  // ---- Instrument config helpers ----

  const addPart = (sectionIdx: number) => {
    setInstrumentConfig(prev => prev.map((sec, i) =>
      i === sectionIdx
        ? { ...sec, parts: [...sec.parts, { partName: "", instrumentId: "" }] }
        : sec
    ));
  };

  const removePart = (sectionIdx: number, partIdx: number) => {
    setInstrumentConfig(prev => prev.map((sec, i) =>
      i === sectionIdx
        ? { ...sec, parts: sec.parts.filter((_, j) => j !== partIdx) }
        : sec
    ));
  };

  const updatePartName = (sectionIdx: number, partIdx: number, val: string) => {
    setInstrumentConfig(prev => prev.map((sec, i) =>
      i === sectionIdx
        ? { ...sec, parts: sec.parts.map((p, j) => j === partIdx ? { ...p, partName: val } : p) }
        : sec
    ));
  };

  // ---- Save ----

  const handleSave = async () => {
    if (!title) {
      await showDialog("タイトルは必須です", true);
      return;
    }
    if (attendanceType === "schedule") {
      const validDates = candidateDates.filter(Boolean);
      if (validDates.length === 0) {
        await showDialog("候補日を1つ以上入力してください", true);
        return;
      }
    } else if (!date) {
      await showDialog("日付は必須です", true);
      return;
    }
    if (!acceptStartDate || !acceptEndDate) {
      await showDialog("受付期間は必須です", true);
      return;
    }
    const s = new Date(acceptStartDate).getTime();
    const e = new Date(acceptEndDate).getTime();
    if (s > e) {
      await showDialog("受付終了日は開始日以降にしてください", true);
      return;
    }
    if (mode === "new" || mode === "copy") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      if (s < tomorrow.getTime()) {
        await showDialog("受付開始日は明日以降にしてください", true);
        return;
      }
    }

    const confirmed = await showDialog(`イベントを${isEdit ? "更新" : "登録"}しますか？`);
    if (!confirmed) return;

    // Build setlist
    const setlist: SetlistGroup[] = setlistGroups
      .filter(g => g.title || g.songIds.some(Boolean))
      .map(g => ({ title: g.title, songIds: g.songIds.filter(Boolean) }));

    // Build instrumentConfig
    const instrConfig: Record<string, InstrumentPart[]> = {};
    instrumentConfig.forEach(sec => {
      const parts = sec.parts
        .filter(p => p.partName)
        .map(p => ({ partName: p.partName, instrumentId: p.instrumentId }));
      if (parts.length > 0) instrConfig[sec.sectionId] = parts;
    });

    const payload: Omit<Event, "id"> = {
      title,
      attendanceType,
      date: attendanceType === "attendance" ? hyphenDateToDot(date) : "",
      candidateDates: attendanceType === "schedule" ? candidateDates.filter(Boolean).map(hyphenDateToDot) : [],
      acceptStartDate: hyphenDateToDot(acceptStartDate),
      acceptEndDate: hyphenDateToDot(acceptEndDate),
      placeName,
      website,
      access,
      googleMap,
      schedule,
      dress,
      bring,
      rent,
      other,
      allowAssign,
      setlist,
      instrumentConfig: instrConfig,
      createdBy: initialEvent?.createdBy || userData?.displayName || "",
    };

    showSpinner();
    try {
      if (isEdit && eventId) {
        await updateEvent(eventId, payload);
      } else {
        await addEvent(payload);
      }
      hideSpinner();
      await showDialog(`${isEdit ? "更新" : "登録"}しました`, true);
      showSpinner();
      router.push("/event");
    } catch {
      hideSpinner();
      await showDialog(`${isEdit ? "更新" : "登録"}に失敗しました`, true);
    }
  };

  const backHref = isEdit && eventId ? `/event/confirm?eventId=${eventId}` : "/event";
  const backText = isEdit ? "イベント確認" : "イベント一覧";

  return (
    <BaseLayout>
      <div className="page-header">
        <h1>{isEdit ? "イベント編集" : "イベント新規作成"}</h1>
      </div>
      <main className="container">
      <>
        {/* 日程調整/出欠確認 */}
        <div className="form-group">
          <label>日程調整 / 出欠確認 <span className="required">*</span></label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="attendance-type"
                value="schedule"
                checked={attendanceType === "schedule"}
                onChange={() => setAttendanceType("schedule")}
              />
              日程調整をする
            </label>
            <label>
              <input
                type="radio"
                name="attendance-type"
                value="attendance"
                checked={attendanceType === "attendance"}
                onChange={() => setAttendanceType("attendance")}
              />
              出欠確認をする
            </label>
          </div>
        </div>

        {/* 候補日（日程調整） */}
        {attendanceType === "schedule" && (
          <div className="form-group">
            <label>日程候補日 <span className="required">*</span></label>
            {candidateDates.map((d, idx) => (
              <div key={idx} className="choice-wrapper">
                <input
                  type="date"
                  value={d}
                  onChange={e => updateCandidateDate(idx, e.target.value)}
                />
                {candidateDates.length > 1 && (
                  <button type="button" className="remove-choice" onClick={() => removeCandidateDate(idx)}>
                    削除
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="add-choice" onClick={addCandidateDate}>
              ＋ 候補日を追加
            </button>
          </div>
        )}

        {/* 日付（出欠確認） */}
        {attendanceType === "attendance" && (
          <div className="form-group">
            <label>日付 <span className="required">*</span></label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
        )}

        {/* 受付期間 */}
        <div className="form-group">
          <label>{attendanceType === "schedule" ? "日程調整受付期間" : "出欠受付期間"} <span className="required">*</span></label>
          <div className="form-group-dates">
            <input
              type="date"
              value={acceptStartDate}
              onChange={e => setAcceptStartDate(e.target.value)}
            />
            ～
            <input
              type="date"
              value={acceptEndDate}
              onChange={e => setAcceptEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* タイトル */}
        <div className="form-group">
          <label>タイトル <span className="required">*</span></label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="イベント名を入力..."
          />
        </div>

        {/* 場所名 */}
        <div className="form-group">
          <label>場所名</label>
          <input
            type="text"
            value={placeName}
            onChange={e => setPlaceName(e.target.value)}
            placeholder="場所名を入力..."
          />
        </div>

        {/* 公式サイト */}
        <div className="form-group">
          <label>公式サイトなど</label>
          <input
            type="text"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            placeholder="公式サイトなどのURLを入力..."
          />
        </div>

        {/* 交通アクセス */}
        <div className="form-group">
          <label>交通アクセス・駐車場情報</label>
          <textarea
            rows={3}
            value={access}
            onChange={e => setAccess(e.target.value)}
            placeholder="交通アクセス・駐車場情報を入力(テキスト or URL)..."
          />
        </div>

        {/* Google Map */}
        <div className="form-group">
          <label>Google Map</label>
          <input
            type="text"
            value={googleMap}
            onChange={e => setGoogleMap(e.target.value)}
            placeholder="Google Mapの共有リンクを入力..."
          />
        </div>

        {/* タイムスケジュール */}
        <div className="form-group">
          <label>タイムスケジュール</label>
          <textarea
            rows={4}
            value={schedule}
            onChange={e => setSchedule(e.target.value)}
            placeholder="スケジュールを入力..."
          />
        </div>

        {/* やる曲 */}
        <div className="form-group">
          <label>やる曲</label>
          {setlistGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="vote-item" style={{ marginBottom: "16px" }}>
              <input
                type="text"
                value={group.title}
                onChange={e => updateSetlistGroupTitle(groupIdx, e.target.value)}
                placeholder="グループ名（例: 前半, 後半）"
                style={{ marginBottom: "8px", width: "100%" }}
              />
              <div className="vote-choices">
                {group.songIds.map((songId, songIdx) => (
                  <div key={songIdx} className="choice-wrapper">
                    <select
                      value={songId}
                      onChange={e => updateSongInGroup(groupIdx, songIdx, e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">-- 曲を選択 --</option>
                      {scores.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="remove-choice"
                      onClick={() => removeSongFromGroup(groupIdx, songIdx)}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="add-choice" onClick={() => addSongToGroup(groupIdx)}>
                ＋ 曲を追加
              </button>
              {setlistGroups.length > 1 && (
                <button type="button" className="remove-item" onClick={() => removeSetlistGroup(groupIdx)}>
                  このグループを削除
                </button>
              )}
            </div>
          ))}
          <button type="button" className="add-item-button" onClick={addSetlistGroup}>
            ＋ グループを追加
          </button>
        </div>

        {/* 服装 */}
        <div className="form-group">
          <label>服装</label>
          <input
            type="text"
            value={dress}
            onChange={e => setDress(e.target.value)}
            placeholder="服装を入力..."
          />
        </div>

        {/* 個人で持ってくるもの */}
        <div className="form-group">
          <label>個人で持ってくるもの</label>
          <textarea
            rows={3}
            value={bring}
            onChange={e => setBring(e.target.value)}
            placeholder="個人で持ってくるものを入力..."
          />
        </div>

        {/* 施設に借りるもの */}
        <div className="form-group">
          <label>施設に借りるもの</label>
          <textarea
            rows={3}
            value={rent}
            onChange={e => setRent(e.target.value)}
            placeholder="施設に借りるものを入力..."
          />
        </div>

        {/* 譜割の登録 */}
        <div className="form-group">
          <label>譜割の登録</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="allow-assign"
                value="on"
                checked={allowAssign === true}
                onChange={() => setAllowAssign(true)}
              />
              受け付ける (本番など)
            </label>
            <label>
              <input
                type="radio"
                name="allow-assign"
                value="off"
                checked={allowAssign === false}
                onChange={() => setAllowAssign(false)}
              />
              受け付けない (練習など)
            </label>
          </div>
        </div>

        {/* 楽器構成 */}
        <div className="form-group">
          <label>楽器構成(譜割り用)</label>
          {instrumentConfig.map((sec, sectionIdx) => {
            const section = sections.find(s => s.id === sec.sectionId);
            return (
              <div key={sec.sectionId} className="instrument-section" style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>
                  {section?.name || sec.sectionId}
                </h3>
                {sec.parts.map((part, partIdx) => (
                  <div key={partIdx} className="choice-wrapper">
                    <input
                      type="text"
                      value={part.partName}
                      onChange={e => updatePartName(sectionIdx, partIdx, e.target.value)}
                      placeholder="パート名を入力（例: Tp1, Ts, Lead）"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="remove-choice"
                      onClick={() => removePart(sectionIdx, partIdx)}
                    >
                      削除
                    </button>
                  </div>
                ))}
                <button type="button" className="add-choice" onClick={() => addPart(sectionIdx)}>
                  ＋ パートを追加
                </button>
              </div>
            );
          })}
        </div>

        {/* その他 */}
        <div className="form-group">
          <label>その他</label>
          <textarea
            rows={3}
            value={other}
            onChange={e => setOther(e.target.value)}
            placeholder="その他情報を入力..."
          />
        </div>
        <div className="confirm-buttons" style={{ marginTop: "1.5rem" }}>
          <button type="button" className="save-button" onClick={handleSave}>
            {isEdit ? "更新" : "登録"}
          </button>
        </div>
      </>
      </main>
      <FormFooter backHref={backHref} backText={backText} />
    </BaseLayout>
  );
}
