"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { FormFooter } from "@/src/components/Form/FormFooter";
import { Modal } from "@/src/components/Modal";
import { Event, Score, Section, Instrument, Studio, SetlistGroup, InstrumentPart, Prefecture, Municipality, EventSolo } from "@/src/lib/firestore/types";
import { addEvent, updateEvent } from "@/src/features/event/api/event-client-service";
import { showDialog, showSpinner, hideSpinner, dotDateToHyphen, hyphenDateToDot, format } from "@/src/lib/functions";
import { SetlistEdit } from "@/src/components/Setlist/SetlistEdit";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { getMunicipalitiesClient } from "@/src/features/users/api/user-client-service";
import { SoloFeatureModal } from "@/src/features/event/components/SoloFeatureModal";
import styles from "./EventEdit.module.css";

type Props = {
  mode: "new" | "edit" | "copy";
  eventId?: string;
  initialEvent?: Event | null;
  initialType: "schedule" | "attendance";
  scores: Score[];
  sections: Section[];
  instruments: Instrument[];
  prefectures: Prefecture[];
  initialDate?: string;
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
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const end = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd")
  };
}

export function EventEditClient({ mode, eventId, initialEvent, initialType, scores, sections, instruments, prefectures, initialDate }: Props) {
  const router = useRouter();
  const { userData, isAdmin, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const isEdit = mode === "edit";
  const { start: defaultStart, end: defaultEnd } = defaultDates();

  const [attendanceType, setAttendanceType] = useState<"schedule" | "attendance">(
    initialEvent?.attendanceType || initialType
  );
  const [date, setDate] = useState(dotDateToHyphen(initialEvent?.date || initialDate || ""));
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
  const [prefectureId, setPrefectureId] = useState(initialEvent?.prefectureId || "");
  const [municipalityId, setMunicipalityId] = useState(initialEvent?.municipalityId || "");
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loadingMun, setLoadingMun] = useState(false);
  const [placeName, setPlaceName] = useState(initialEvent?.placeName || "");
  const [website, setWebsite] = useState(initialEvent?.website || "");
  const [access, setAccess] = useState(initialEvent?.access || "");
  const [googleMap, setGoogleMap] = useState(initialEvent?.googleMap || "");
  const [youtubeUrl, setYoutubeUrl] = useState(initialEvent?.youtubeUrl || "");
  const [youtubeTimestamps, setYoutubeTimestamps] = useState<{ time: string; comment: string }[]>(
    initialEvent?.youtubeTimestamps || []
  );
  const [rentTimeRanges, setRentTimeRanges] = useState<{ startTime: string; endTime: string }[]>(
    initialEvent?.rentTimeRanges || []
  );
  const [schedule, setSchedule] = useState(initialEvent?.schedule || "");
  const [dress, setDress] = useState(initialEvent?.dress || "");
  const [bring, setBring] = useState(initialEvent?.bring || "");
  const [rent, setRent] = useState(initialEvent?.rent || "");
  const [other, setOther] = useState(initialEvent?.other || "");
  const [allowAssign, setAllowAssign] = useState(initialEvent?.allowAssign ?? false);
  const [isVenueReserved, setIsVenueReserved] = useState(initialEvent?.isVenueReserved ?? false);

  const [setlistGroups, setSetlistGroups] = useState<SetlistGroup[]>(
    initialEvent?.setlist?.map(g => ({ title: g.title, songIds: g.songIds || [] })) ||
    [{ title: "", songIds: [] }]
  );

  // ---- セットリストの譜面から楽器構成・ソロ・フィーチャーを生成するロジック ----
  const extractConfigAndSolosFromSetlist = React.useCallback((targetSetlist: SetlistGroup[]) => {
    const songIds = Array.from(new Set(targetSetlist.flatMap(g => g.songIds).filter(Boolean)));
    const targetScores = songIds
      .map(id => scores.find(s => s.id === id))
      .filter((s): s is Score => !!s);

    // 1. 楽器構成
    const newConfig: InstrumentSectionState[] = sections.map(sec => {
      const partsMap = new Map<string, { originalName: string; instrumentId: string }>();

      targetScores.forEach(score => {
        const secParts = score.instrumentConfig?.[sec.id] || [];
        secParts.forEach(p => {
          const name = p.partName.trim();
          if (!name && !p.instrumentId) return;
          const key = name.toLowerCase();
          if (!partsMap.has(key)) {
            partsMap.set(key, { originalName: name || "パート", instrumentId: p.instrumentId || "" });
          } else {
            const current = partsMap.get(key)!;
            if (!current.instrumentId && p.instrumentId) {
              current.instrumentId = p.instrumentId;
            }
          }
        });
      });

      const parts: InstrumentPartState[] = Array.from(partsMap.values()).map(item => ({
        partName: item.originalName,
        instrumentId: item.instrumentId,
      }));

      return {
        sectionId: sec.id,
        parts: parts.length > 0 ? parts : [{ partName: "", instrumentId: "" }],
      };
    });

    // 2. ソロ
    const newSolos: EventSolo[] = [];
    targetScores.forEach(score => {
      (score.solos || []).forEach(s => {
        const pName = s.partName.trim();
        if (!pName) return;
        if (!newSolos.some(exist => exist.songId === score.id && exist.partName === pName)) {
          newSolos.push({ songId: score.id, partName: pName });
        }
      });
    });

    // 3. フィーチャー
    const newFeatures: EventSolo[] = [];
    targetScores.forEach(score => {
      (score.features || []).forEach(f => {
        const pName = f.partName.trim();
        if (!pName) return;
        if (!newFeatures.some(exist => exist.songId === score.id && exist.partName === pName)) {
          newFeatures.push({ songId: score.id, partName: pName });
        }
      });
    });

    const hasAnyConfig = newConfig.some(sec => sec.parts.some(p => p.partName || p.instrumentId));

    return {
      songCount: targetScores.length,
      hasAnyConfig,
      newConfig,
      newSolos,
      newFeatures,
    };
  }, [sections, scores]);

  // Instrument config: 初期値設定
  const initInstrumentConfig = () => {
    // 既存イベントに楽器構成が登録されている場合は最優先で使用
    const hasInitialConfig = sections.some(sec => (initialEvent?.instrumentConfig?.[sec.id] || []).length > 0);
    if (hasInitialConfig) {
      return sections.map(sec => {
        const parts = initialEvent?.instrumentConfig?.[sec.id] || [];
        return {
          sectionId: sec.id,
          parts: parts.length > 0
            ? parts.map(p => ({ partName: p.partName, instrumentId: p.instrumentId || "" }))
            : [{ partName: "", instrumentId: "" }],
        };
      });
    }

    // 既存の楽器構成がない場合、セットリストの曲から初期設定
    const initialSetlist = initialEvent?.setlist?.map(g => ({ title: g.title, songIds: g.songIds || [] })) || [{ title: "", songIds: [] }];
    const extracted = extractConfigAndSolosFromSetlist(initialSetlist);
    if (extracted.hasAnyConfig) {
      return extracted.newConfig;
    }

    return sections.map(sec => ({
      sectionId: sec.id,
      parts: [{ partName: "", instrumentId: "" }],
    }));
  };

  const [instrumentConfig, setInstrumentConfig] = useState<InstrumentSectionState[]>(initInstrumentConfig);

  const [solos, setSolos] = useState<EventSolo[]>(() => {
    if (initialEvent?.solos && initialEvent.solos.length > 0) {
      return initialEvent.solos;
    }
    const initialSetlist = initialEvent?.setlist?.map(g => ({ title: g.title, songIds: g.songIds || [] })) || [{ title: "", songIds: [] }];
    const extracted = extractConfigAndSolosFromSetlist(initialSetlist);
    return extracted.newSolos;
  });

  const [features, setFeatures] = useState<EventSolo[]>(() => {
    if (initialEvent?.features && initialEvent.features.length > 0) {
      return initialEvent.features;
    }
    const initialSetlist = initialEvent?.setlist?.map(g => ({ title: g.title, songIds: g.songIds || [] })) || [{ title: "", songIds: [] }];
    const extracted = extractConfigAndSolosFromSetlist(initialSetlist);
    return extracted.newFeatures;
  });

  const [soloFeatureModalOpen, setSoloFeatureModalOpen] = useState(false);

  useEffect(() => {
    if (initialEvent?.solos && initialEvent.solos.length > 0) {
      setSolos(initialEvent.solos);
    }
    if (initialEvent?.features && initialEvent.features.length > 0) {
      setFeatures(initialEvent.features);
    }
  }, [initialEvent]);
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

  // 都道府県が変更されたら市区町村をロード
  useEffect(() => {
    const loadMun = async () => {
      if (!prefectureId) {
        setMunicipalities([]);
        setMunicipalityId("");
        return;
      }
      setLoadingMun(true);
      try {
        const data = await getMunicipalitiesClient(prefectureId);
        setMunicipalities(data);
        
        setMunicipalityId(prev => {
          if (prev && data.some(m => m.id === prev)) {
            return prev;
          }
          return "";
        });
      } catch (e) {
        console.error("Failed to load municipalities:", e);
      } finally {
        setLoadingMun(false);
      }
    };
    loadMun();
  }, [prefectureId]);

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

  const addYoutubeTimestamp = () => {
    setYoutubeTimestamps(prev => [...prev, { time: "", comment: "" }]);
  };

  const updateYoutubeTimestamp = (idx: number, field: "time" | "comment", val: string) => {
    setYoutubeTimestamps(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const removeYoutubeTimestamp = (idx: number) => {
    setYoutubeTimestamps(prev => prev.filter((_, i) => i !== idx));
  };
  
  const addRentTimeRange = () => {
    setRentTimeRanges(prev => [...prev, { startTime: "", endTime: "" }]);
  };

  const removeRentTimeRange = (idx: number) => {
    setRentTimeRanges(prev => prev.filter((_, i) => i !== idx));
  };

  const updateRentTimeRange = (idx: number, field: "startTime" | "endTime", val: string) => {
    setRentTimeRanges(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  // ソロ設定用の利用可能な曲一覧（セットリスト内の全曲）
  const availableSongs = React.useMemo(() => {
    const songIdSet = new Set<string>();
    setlistGroups.forEach(g => {
      g.songIds.forEach(id => {
        if (id) songIdSet.add(id);
      });
    });
    return Array.from(songIdSet).map(songId => {
      const score = scores.find(s => s.id === songId);
      return {
        id: songId,
        label: score?.abbreviation || score?.title || "曲名不明"
      };
    });
  }, [setlistGroups, scores]);

  // ソロ設定用の利用可能なパート一覧（楽器構成内のパート名）
  const availableParts = React.useMemo(() => {
    const partSet = new Set<string>();
    instrumentConfig.forEach(sec => {
      sec.parts.forEach(p => {
        const name = p.partName.trim();
        if (name) partSet.add(name);
      });
    });
    return Array.from(partSet);
  }, [instrumentConfig]);

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

  // ---- セットリストから楽器構成・ソロ・フィーチャーを一括反映 ----
  const handleApplyFromSetlistScores = async () => {
    const extracted = extractConfigAndSolosFromSetlist(setlistGroups);
    if (extracted.songCount === 0) {
      await showDialog("セットリストに曲が選択されていません。先にセットリストの曲を選択してください。", true);
      return;
    }

    const totalParts = extracted.newConfig.reduce(
      (acc, sec) => acc + sec.parts.filter(p => p.partName || p.instrumentId).length,
      0
    );

    const confirm = await showDialog(
      `セットリストに含まれる譜面（計${extracted.songCount}曲）から、楽器構成、ソロ、フィーチャーを自動反映しますか？\n` +
      `（現在の楽器構成・ソロ・Feat設定は上書きされます）`
    );
    if (!confirm) return;

    if (extracted.hasAnyConfig) {
      setInstrumentConfig(extracted.newConfig);
    }
    setSolos(extracted.newSolos);
    setFeatures(extracted.newFeatures);

    await showDialog(
      `セットリストから反映が完了しました！\n` +
      `・楽器構成: ${totalParts}パート\n` +
      `・ソロ: ${extracted.newSolos.length}件\n` +
      `・フィーチャー: ${extracted.newFeatures.length}件`,
      true
    );
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
    setPrefectureId(studio.prefecture || "");
    setMunicipalityId(studio.municipality || "");
    setStudioModalOpen(false);
  };

  // ---- Save ----

  const handleSave = async () => {
    if (!title) {
      await showDialog("タイトルは必須です", true);
      return;
    }
    if (!prefectureId) {
      await showDialog("都道府県は必須です", true);
      return;
    }
    if (!municipalityId) {
      await showDialog("市区町村は必須です", true);
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
    if (acceptStartDate > acceptEndDate) {
      await showDialog("受付終了日は開始日以降にしてください", true);
      return;
    }
    if (mode === "new" || mode === "copy") {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      if (acceptStartDate <= todayStr) {
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
      prefectureId,
      municipalityId,
      website,
      access,
      googleMap,
      youtubeUrl,
      youtubeTimestamps: youtubeTimestamps.filter(t => t.time || t.comment),
      rentTimeRanges: rentTimeRanges.filter(r => r.startTime && r.endTime),
      schedule,
      dress,
      bring,
      rent,
      other,
      allowAssign,
      setlist,
      instrumentConfig: instrConfig,
      solos: allowAssign ? solos.filter(s => s.songId && s.partName) : [],
      features: allowAssign ? features.filter(f => f.songId && f.partName) : [],
      isVenueReserved,
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

        {/* 場所・アクセス情報ブロック */}
        <div className={styles.locationBlock}>
          <div className={styles.locationHeader}>
            <span className={styles.locationTitle}>
              <i className="fa-solid fa-map-location-dot" /> 場所・アクセス情報
            </span>
            <button
              type="button"
              className="add-choice"
              onClick={handleOpenStudioModal}
              style={{ whiteSpace: "nowrap", padding: "6px 12px", fontSize: "14px", margin: 0 }}
            >
              <i className="fas fa-music" /> スタジオから選ぶ
            </button>
          </div>

          <div className={styles.locationFields}>
            {/* 都道府県 & 市区町村 */}
            <div className={styles.row}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>都道府県 <span className="required">*</span></label>
                <select
                  value={prefectureId}
                  onChange={e => setPrefectureId(e.target.value)}
                >
                  <option value="">都道府県を選択してください</option>
                  {prefectures.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>市区町村 <span className="required">*</span></label>
                <select
                  value={municipalityId}
                  onChange={e => setMunicipalityId(e.target.value)}
                  disabled={!prefectureId || loadingMun}
                >
                  <option value="">{loadingMun ? "読み込み中..." : "市区町村を選択してください"}</option>
                  {municipalities.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 場所名 */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>場所名</label>
              <input
                type="text"
                value={placeName}
                onChange={e => setPlaceName(e.target.value)}
                placeholder="場所名を入力..."
              />
            </div>

            {/* 公式サイト */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>公式サイトなど</label>
              <input
                type="text"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="公式サイトなどのURLを入力..."
              />
            </div>

            {/* 施設利用時間 */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>施設利用時間</label>
              {rentTimeRanges.map((range, idx) => (
                <div key={idx} className="choice-wrapper" style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <input
                    type="time"
                    value={range.startTime}
                    onChange={e => updateRentTimeRange(idx, "startTime", e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <span>～</span>
                  <input
                    type="time"
                    value={range.endTime}
                    onChange={e => updateRentTimeRange(idx, "endTime", e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="remove-choice" onClick={() => removeRentTimeRange(idx)} title="削除">
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              ))}
              <button type="button" className="add-choice" onClick={addRentTimeRange} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <i className="fa-solid fa-plus"></i> 施設利用時間を追加
              </button>
            </div>

            {/* Google Map */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Google Map</label>
              <input
                type="text"
                value={googleMap}
                onChange={e => setGoogleMap(e.target.value)}
                placeholder="Google Mapの共有リンクを入力..."
              />
            </div>

            {/* 交通アクセス */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>交通アクセス・駐車場情報</label>
              <textarea
                rows={3}
                value={access}
                onChange={e => setAccess(e.target.value)}
                placeholder="交通アクセス・駐車場情報を入力(テキスト or URL)..."
              />
            </div>

            {/* 会場押さえ済みチェックボックス */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={isVenueReserved}
                  onChange={e => setIsVenueReserved(e.target.checked)}
                />
                会場押さえ済み
              </label>
            </div>
          </div>
        </div>

        {/* YouTube */}
        <div className="form-group">
          <label className="label-title">YouTube動画リンク</label>
          <input
            type="text"
            value={youtubeUrl}
            onChange={e => setYoutubeUrl(e.target.value)}
            placeholder="YouTubeのURLを入力..."
          />
          {youtubeUrl && (
            <div style={{ marginTop: "12px" }}>
              <label style={{ fontSize: "13px", color: "#666", fontWeight: "bold", display: "block", marginBottom: "8px" }}>
                <i className="fa-solid fa-clock" style={{ marginRight: "4px" }} />
                タイムスタンプとコメント
              </label>
              {youtubeTimestamps.map((t, idx) => (
                <div key={idx} className="choice-wrapper" style={{ marginBottom: "8px" }}>
                  <input
                    type="text"
                    value={t.time}
                    onChange={e => updateYoutubeTimestamp(idx, "time", e.target.value)}
                    placeholder="分:秒 (例 1:23)"
                    style={{ width: "100px", flex: "none" }}
                  />
                  <input
                    type="text"
                    value={t.comment}
                    onChange={e => updateYoutubeTimestamp(idx, "comment", e.target.value)}
                    placeholder="コメントを入力してください"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="remove-choice" onClick={() => removeYoutubeTimestamp(idx)} title="削除">
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              ))}
              <button type="button" className="add-choice" onClick={addYoutubeTimestamp} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <i className="fa-solid fa-plus"></i> タイムスタンプを追加
              </button>
            </div>
          )}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
              <label style={{ margin: 0 }}>楽器構成(譜割り用)</label>
              <button
                type="button"
                className="add-choice"
                style={{
                  width: "auto",
                  padding: "6px 14px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  backgroundColor: "#f0f9ff",
                  borderColor: "#0284c7",
                  color: "#0284c7",
                }}
                onClick={handleApplyFromSetlistScores}
                title="セットリストに含まれる譜面マスタから楽器構成・ソロ・フィーチャーを一括反映します"
              >
                <i className="fa-solid fa-wand-magic-sparkles" /> セットリストから楽器構成・ソロ・Featを反映
              </button>
            </div>
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
                        title="削除"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  ))}
                  <button type="button" className="add-choice" onClick={() => addPart(sectionIdx)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <i className="fa-solid fa-plus"></i> パートを追加
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ソロ・フィーチャー設定 */}
        {allowAssign && (
          <div className="form-group">
            <label>ソロ・フィーチャー設定 (譜割り用)</label>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
              曲ごとのソロパートおよびフィーチャー（Feat）パートを設定できます。譜割り確認・編集画面でハイライト表示されます。
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
              <button
                type="button"
                className="add-choice"
                style={{ width: "auto", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => setSoloFeatureModalOpen(true)}
              >
                <i className="fa-solid fa-sliders" /> ソロ・フィーチャーを設定する
              </button>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                <span>ソロ: <strong>{solos.length}</strong>箇所</span>
                <span style={{ margin: "0 6px" }}>/</span>
                <span>Feat: <strong>{features.length}</strong>箇所</span>
              </div>
            </div>

            {/* 設定サマリのプレビューカード */}
            {(solos.length > 0 || features.length > 0) && (
              <div style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px"
              }}>
                {Array.from(new Set([...solos.map(s => s.songId), ...features.map(f => f.songId)])).map(songId => {
                  const score = scores.find(s => s.id === songId);
                  const songName = score?.abbreviation || score?.title || "曲名不明";
                  const songSolos = solos.filter(s => s.songId === songId);
                  const songFeatures = features.filter(f => f.songId === songId);
                  return (
                    <div key={songId} style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: "#1e293b" }}>{songName}:</span>
                      {songSolos.map(s => (
                        <span key={s.partName} style={{
                          backgroundColor: "#fef08a",
                          color: "#713f12",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontWeight: 600
                        }}>
                          Solo: {s.partName}
                        </span>
                      ))}
                      {songFeatures.map(f => (
                        <span key={f.partName} style={{
                          backgroundColor: "#fce7f3",
                          color: "#831843",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontWeight: 600
                        }}>
                          Feat: {f.partName}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
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
                            setPrefectureId(studio.prefecture || "");
                            setMunicipalityId(studio.municipality || "");
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

      {/* ソロ・フィーチャー設定モーダル */}
      <SoloFeatureModal
        isOpen={soloFeatureModalOpen}
        onClose={() => setSoloFeatureModalOpen(false)}
        setlistGroups={setlistGroups}
        scores={scores}
        availableParts={availableParts}
        solos={solos}
        features={features}
        onSave={(newSolos, newFeatures) => {
          setSolos(newSolos);
          setFeatures(newFeatures);
        }}
      />
    </BaseLayout>
  );
}
