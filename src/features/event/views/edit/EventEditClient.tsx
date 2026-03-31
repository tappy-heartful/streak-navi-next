"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { FormFooter } from "@/src/components/Form/FormFooter";
import { Modal } from "@/src/components/Modal";
import { Event, Score, Section, Instrument, Studio, SetlistGroup, InstrumentPart } from "@/src/lib/firestore/types";
import { addEvent, updateEvent } from "@/src/features/event/api/event-client-service";
import { showDialog, showSpinner, hideSpinner, dotDateToHyphen, hyphenDateToDot } from "@/src/lib/functions";
import { SetlistEdit } from "@/src/components/Setlist/SetlistEdit";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

type Props = {
  mode: "new" | "edit" | "copy";
  eventId?: string;
  initialEvent?: Event | null;
  initialType: "schedule" | "attendance";
  scores: Score[];
  sections: Section[];
  instruments: Instrument[];
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

export function EventEditClient({ mode, eventId, initialEvent, initialType, scores, sections, instruments }: Props) {
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

  const [setlistGroups, setSetlistGroups] = useState<SetlistGroup[]>(
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
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [studioModalOpen, setStudioModalOpen] = useState(false);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [selectedStudioRoom, setSelectedStudioRoom] = useState<{ sIdx: number; rIdx: number } | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      showDialog("この操作を行う権限がありません。", true).then(() => router.push("/event"));
      return;
    }
    setIsAuthorized(true);
    const crumbs = [{ title: "イベント一覧", href: "/event" }];
    if (isEdit || mode === "copy") {
      crumbs.push({ title: "イベント確認", href: `/event/confirm?eventId=${eventId}` });
    }
    crumbs.push({ title: isEdit ? "イベント編集" : "イベント新規作成", href: "" });
    setBreadcrumbs(crumbs);
  }, [loading, isAdmin]);

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

  const updateInstrumentId = (sectionIdx: number, partIdx: number, val: string) => {
    setInstrumentConfig(prev => prev.map((sec, i) =>
      i === sectionIdx
        ? { ...sec, parts: sec.parts.map((p, j) => j === partIdx ? { ...p, instrumentId: val } : p) }
        : sec
    ));
  };

  // ---- Studio selection ----

  const handleOpenStudioModal = async () => {
    showSpinner();
    try {
      const snap = await getDocs(collection(db, "studios"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Studio));
      data.sort((a, b) => {
        const pa = a.prefecture || "ZZZ";
        const pb = b.prefecture || "ZZZ";
        if (pa !== pb) return pa.localeCompare(pb, "ja");
        return (a.name || "").localeCompare(b.name || "", "ja");
      });
      setStudios(data);
      setSelectedStudioRoom(null);
    } finally {
      hideSpinner();
    }
    setStudioModalOpen(true);
  };

  const handleConfirmStudio = () => {
    if (!selectedStudioRoom) return;
    const { sIdx, rIdx } = selectedStudioRoom;
    const studio = studios[sIdx];
    const room = studio.rooms?.[rIdx] ?? "";
    setPlaceName(`${studio.name} ${room}`.trim());
    setWebsite(studio.hp || "");
    setAccess(studio.access || "");
    setGoogleMap(studio.map || "");
    setStudioModalOpen(false);
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
    let configError = "";
    instrumentConfig.forEach(sec => {
      const parts = sec.parts
        .filter(p => p.partName || p.instrumentId)
        .map(p => {
          if (p.partName.length > 4) {
            configError = "パート名は4文字以内で入力してください";
          }
          return { partName: p.partName, instrumentId: p.instrumentId };
        });
      if (parts.length > 0) instrConfig[sec.sectionId] = parts;
    });

    if (configError) {
      await showDialog(configError, true);
      return;
    }

    if (allowAssign && Object.keys(instrConfig).length === 0) {
      await showDialog("楽器構成を最低1つ登録してください", true);
      return;
    }

    const payload: Omit<Event, "id"> = {
      title,
      attendanceType,
      date: attendanceType === "attendance" ? hyphenDateToDot(date) : "",
      candidateDates: attendanceType === "schedule" ? candidateDates.filter(Boolean).map(hyphenDateToDot).sort() : [],
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
      router.refresh();
      showSpinner();
      router.push("/event");
    } catch {
      hideSpinner();
      await showDialog(`${isEdit ? "更新" : "登録"}に失敗しました`, true);
    }
  };

  const backHref = isEdit && eventId ? `/event/confirm?eventId=${eventId}` : "/event";
  const backText = isEdit ? "イベント確認" : "イベント一覧";

  if (loading || !isAuthorized) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>読み込み中...</div>;
  }

  return (
    <BaseLayout>
      <div className="page-header">
        <h1><i className="fa-solid fa-calendar-days" /> {isEdit ? "イベント編集" : "イベント新規作成"}</h1>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label style={{ marginBottom: 0 }}>場所名</label>
            <button type="button" className="add-choice" onClick={handleOpenStudioModal} style={{ whiteSpace: "nowrap", padding: "6px 12px", fontSize: "14px" }}>
              <i className="fas fa-music" /> スタジオから選ぶ
            </button>
          </div>
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

        {/* セットリスト */}
        <div className="form-group">
          <label className="label-title">セットリスト</label>
          <SetlistEdit
            setlist={setlistGroups}
            scores={scores}
            onChange={setSetlistGroups}
          />
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
        {allowAssign && (
          <div className="form-group">
            <label>楽器構成(譜割り用)</label>
            {instrumentConfig.map((sec, sectionIdx) => {
              const section = sections.find(s => s.id === sec.sectionId);
              const sectionInstruments = instruments.filter(inst => inst.sectionId === sec.sectionId);
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
                        placeholder="パート名（例: Tp1, Ts, Lead）"
                        style={{ flex: 1 }}
                        maxLength={4}
                      />
                      <select
                        value={part.instrumentId}
                        onChange={e => updateInstrumentId(sectionIdx, partIdx, e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="">楽器を選択</option>
                        {sectionInstruments.map(inst => (
                          <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                      </select>
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
        )}

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

      {studioModalOpen && (
        <Modal title="場所を選択" onClose={() => setStudioModalOpen(false)}>
          <div>
            {studios.length === 0 ? (
              <p style={{ color: "#999" }}>スタジオが登録されていません</p>
            ) : (
              studios.map((studio) => (
                <div key={studio.id} style={{ marginBottom: "16px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "14px" }}>
                    <i className="fas fa-music" style={{ marginRight: "6px", color: "#4caf50" }} />
                    {studio.name}
                    {studio.prefecture && (
                      <span style={{ fontWeight: "normal", fontSize: "0.85em", marginLeft: "8px", color: "#777" }}>
                        {studio.prefecture}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingLeft: "12px" }}>
                    {studio.rooms && studio.rooms.length > 0 ? (
                      studio.rooms.map((room, rIdx) => (
                        <button
                          key={rIdx}
                          type="button"
                          className="add-choice"
                          style={{ padding: "6px 12px", fontSize: "13px" }}
                          onClick={() => {
                            setPlaceName(`${studio.name} ${room}`.trim());
                            setWebsite(studio.hp || "");
                            setAccess(studio.access || "");
                            setGoogleMap(studio.map || "");
                            setStudioModalOpen(false);
                          }}
                        >
                          {room}
                        </button>
                      ))
                    ) : (
                      <span style={{ color: "#999", fontSize: "0.82em" }}>ルーム情報なし</span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
              <button type="button" className="back-link" onClick={() => setStudioModalOpen(false)} style={{ border: "none", background: "none", color: "#666", textDecoration: "underline" }}>
                キャンセル
              </button>
            </div>
          </div>
        </Modal>
      )}
    </BaseLayout>
  );
}
