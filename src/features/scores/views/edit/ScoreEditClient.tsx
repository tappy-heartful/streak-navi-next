"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { FormField } from "@/src/components/Form/FormField";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { GenreInput } from "../../components/GenreInput";
import { AppInput } from "@/src/components/Form/AppInput";
import { ScoreFileUpload } from "../../components/ScoreFileUpload";
import { saveScore } from "@/src/features/scores/api/score-client-service";
import { rules } from "@/src/lib/validation";
import { Genre, Score, ScoreFile, Section, Instrument, InstrumentPart } from "@/src/lib/firestore/types";
import { useAppForm } from "@/src/hooks/useAppForm";
import styles from "./ScoreEdit.module.css";

type Props = {
  mode: "new" | "edit" | "copy";
  scoreId?: string;
  initialScore: Score | null;
  allGenres: Genre[];
  allSections: Section[];
  allInstruments: Instrument[];
  defaultInstrumentConfig?: Record<string, InstrumentPart[]>;
};

export function ScoreEditClient({
  mode,
  scoreId,
  initialScore,
  allGenres,
  allSections,
  allInstruments,
  defaultInstrumentConfig = {},
}: Props) {
  const { user } = useAuth();
  const [files, setFiles] = useState<ScoreFile[]>(initialScore?.files || []);

  // 1. 楽器構成ステート（セクションIDキーのオブジェクト）
  const [instrumentConfig, setInstrumentConfig] = useState<Record<string, InstrumentPart[]>>(() => {
    if (initialScore?.instrumentConfig && Object.keys(initialScore.instrumentConfig).length > 0) {
      return initialScore.instrumentConfig;
    }
    // 新規作成時はマスタで設定されたデフォルト楽器構成を自動初期セット
    if (mode === "new" && defaultInstrumentConfig && Object.keys(defaultInstrumentConfig).length > 0) {
      return defaultInstrumentConfig;
    }
    return {};
  });

  // 2. ソロ・フィーチャーステート
  const [solos, setSolos] = useState<InstrumentPart[]>(() => {
    return initialScore?.solos || [];
  });

  const [features, setFeatures] = useState<InstrumentPart[]>(() => {
    return initialScore?.features || [];
  });

  // 3. フォーム初期値とバリデーション
  const form = useAppForm(
    {
      title: (mode === "copy" ? `${initialScore?.title}（コピー）` : initialScore?.title) || "",
      referenceTrack: initialScore?.referenceTrack || "",
      genres: (initialScore?.genres as string[]) || [""],
      abbreviation: initialScore?.abbreviation || "",
      note: initialScore?.note || "",
      isDispTop: mode === "new" ? true : (initialScore?.isDispTop ?? false),
    },
    {
      title: [rules.required],
      referenceTrack: [rules.required, rules.youtube],
      abbreviation: [rules.required, rules.max8],
      genres: [(v) => (v[0] ? true : "最低1つ選択してください")],
    }
  );

  const inputProps = (field: keyof typeof form.formData) => ({
    field,
    value: form.formData[field],
    error: form.errors[field],
    updateField: form.updateField,
  });

  // ---- 楽器編成ヘルパー ----
  const addPart = (sectionId: string) => {
    setInstrumentConfig((prev) => {
      const current = prev[sectionId] || [];
      return {
        ...prev,
        [sectionId]: [...current, { partName: "", instrumentId: "" }],
      };
    });
  };

  const removePart = (sectionId: string, partIdx: number) => {
    setInstrumentConfig((prev) => {
      const current = prev[sectionId] || [];
      return {
        ...prev,
        [sectionId]: current.filter((_, i) => i !== partIdx),
      };
    });
  };

  const updatePart = (
    sectionId: string,
    partIdx: number,
    field: "partName" | "instrumentId",
    val: string
  ) => {
    setInstrumentConfig((prev) => {
      const current = prev[sectionId] || [];
      return {
        ...prev,
        [sectionId]: current.map((p, i) => (i === partIdx ? { ...p, [field]: val } : p)),
      };
    });
  };

  // 標準編成セット（セクション別）
  const setStandardSectionParts = (sectionId: string) => {
    // マスタで設定されたデフォルト構成にあればそれを最優先で使用
    if (defaultInstrumentConfig?.[sectionId] && defaultInstrumentConfig[sectionId].length > 0) {
      setInstrumentConfig((prev) => ({
        ...prev,
        [sectionId]: [...defaultInstrumentConfig[sectionId]],
      }));
      return;
    }

    const sec = allSections.find((s) => s.id === sectionId);
    if (!sec) return;

    let parts: InstrumentPart[] = [];
    if (sec.name.includes("サックス") || sec.name.includes("Sax")) {
      parts = [
        { partName: "A1", instrumentId: allInstruments.find((i) => i.id === "as" || i.id === "1")?.id || "" },
        { partName: "A2", instrumentId: allInstruments.find((i) => i.id === "as" || i.id === "1")?.id || "" },
        { partName: "T1", instrumentId: allInstruments.find((i) => i.id === "ts" || i.id === "2")?.id || "" },
        { partName: "T2", instrumentId: allInstruments.find((i) => i.id === "ts" || i.id === "2")?.id || "" },
        { partName: "B", instrumentId: allInstruments.find((i) => i.id === "bs" || i.id === "3")?.id || "" },
      ];
    } else if (sec.name.includes("トランペット") || sec.name.includes("Trumpet")) {
      parts = [
        { partName: "1", instrumentId: allInstruments.find((i) => i.id === "tp" || i.id === "4")?.id || "" },
        { partName: "2", instrumentId: allInstruments.find((i) => i.id === "tp" || i.id === "4")?.id || "" },
        { partName: "3", instrumentId: allInstruments.find((i) => i.id === "tp" || i.id === "4")?.id || "" },
        { partName: "4", instrumentId: allInstruments.find((i) => i.id === "tp" || i.id === "4")?.id || "" },
      ];
    } else if (sec.name.includes("トロンボーン") || sec.name.includes("Trombone")) {
      parts = [
        { partName: "1", instrumentId: allInstruments.find((i) => i.id === "tb" || i.id === "5")?.id || "" },
        { partName: "2", instrumentId: allInstruments.find((i) => i.id === "tb" || i.id === "5")?.id || "" },
        { partName: "3", instrumentId: allInstruments.find((i) => i.id === "tb" || i.id === "5")?.id || "" },
        { partName: "4 (B)", instrumentId: allInstruments.find((i) => i.id === "btb" || i.id === "6")?.id || allInstruments.find((i) => i.id === "tb")?.id || "" },
      ];
    } else if (sec.name.includes("リズム") || sec.name.includes("Rhythm")) {
      parts = [
        { partName: "Pf", instrumentId: allInstruments.find((i) => i.id === "pf" || i.id === "7")?.id || "" },
        { partName: "Gt", instrumentId: allInstruments.find((i) => i.id === "gt" || i.id === "8")?.id || "" },
        { partName: "Ba", instrumentId: allInstruments.find((i) => i.id === "ba" || i.id === "9")?.id || "" },
        { partName: "Dr", instrumentId: allInstruments.find((i) => i.id === "dr" || i.id === "10")?.id || "" },
      ];
    }

    if (parts.length > 0) {
      setInstrumentConfig((prev) => ({
        ...prev,
        [sectionId]: parts,
      }));
    }
  };

  // 全セクション一括で標準17人編成をセット
  const setAllStandardParts = () => {
    // マスタで設定されたデフォルト構成があればそれを最優先で使用
    if (defaultInstrumentConfig && Object.keys(defaultInstrumentConfig).length > 0) {
      setInstrumentConfig({ ...defaultInstrumentConfig });
      return;
    }

    const newConfig: Record<string, InstrumentPart[]> = {};
    allSections.forEach((sec) => {
      if (sec.name.includes("サックス") || sec.name.includes("Sax")) {
        newConfig[sec.id] = [
          { partName: "A1", instrumentId: allInstruments.find((i) => i.id === "as" || i.id === "1")?.id || "" },
          { partName: "A2", instrumentId: allInstruments.find((i) => i.id === "as" || i.id === "1")?.id || "" },
          { partName: "T1", instrumentId: allInstruments.find((i) => i.id === "ts" || i.id === "2")?.id || "" },
          { partName: "T2", instrumentId: allInstruments.find((i) => i.id === "ts" || i.id === "2")?.id || "" },
          { partName: "B", instrumentId: allInstruments.find((i) => i.id === "bs" || i.id === "3")?.id || "" },
        ];
      } else if (sec.name.includes("トランペット") || sec.name.includes("Trumpet")) {
        newConfig[sec.id] = [
          { partName: "1", instrumentId: allInstruments.find((i) => i.id === "tp" || i.id === "4")?.id || "" },
          { partName: "2", instrumentId: allInstruments.find((i) => i.id === "tp")?.id || "" },
          { partName: "3", instrumentId: allInstruments.find((i) => i.id === "tp")?.id || "" },
          { partName: "4", instrumentId: allInstruments.find((i) => i.id === "tp")?.id || "" },
        ];
      } else if (sec.name.includes("トロンボーン") || sec.name.includes("Trombone")) {
        newConfig[sec.id] = [
          { partName: "1", instrumentId: allInstruments.find((i) => i.id === "tb" || i.id === "5")?.id || "" },
          { partName: "2", instrumentId: allInstruments.find((i) => i.id === "tb")?.id || "" },
          { partName: "3", instrumentId: allInstruments.find((i) => i.id === "tb")?.id || "" },
          { partName: "4 (B)", instrumentId: allInstruments.find((i) => i.id === "btb" || i.id === "6")?.id || allInstruments.find((i) => i.id === "tb")?.id || "" },
        ];
      } else if (sec.name.includes("リズム") || sec.name.includes("Rhythm")) {
        newConfig[sec.id] = [
          { partName: "Pf", instrumentId: allInstruments.find((i) => i.id === "pf" || i.id === "7")?.id || "" },
          { partName: "Gt", instrumentId: allInstruments.find((i) => i.id === "gt" || i.id === "8")?.id || "" },
          { partName: "Ba", instrumentId: allInstruments.find((i) => i.id === "ba" || i.id === "9")?.id || "" },
          { partName: "Dr", instrumentId: allInstruments.find((i) => i.id === "dr" || i.id === "10")?.id || "" },
        ];
      }
    });
    setInstrumentConfig(newConfig);
  };

  // ---- ソロ・フィーチャー用の選択可能パーツ一覧 ----
  // 楽器構成（instrumentConfig）から抽出
  const availablePartsForSoloFeature = useMemo(() => {
    const list: { key: string; label: string; part: InstrumentPart }[] = [];
    allSections.forEach((sec) => {
      const parts = instrumentConfig[sec.id] || [];
      parts.forEach((p, idx) => {
        const pName = p.partName.trim();
        if (!pName && !p.instrumentId) return;
        const inst = allInstruments.find((i) => i.id === p.instrumentId);
        const instLabel = inst ? ` (${inst.name})` : "";
        const label = `[${sec.name}] ${pName || "パート"}${instLabel}`;
        const key = `${sec.id}___${pName}___${p.instrumentId || ""}___${idx}`;
        list.push({
          key,
          label,
          part: { partName: pName || "パート", instrumentId: p.instrumentId || "" },
        });
      });
    });
    return list;
  }, [allSections, allInstruments, instrumentConfig]);

  // ソロ追加
  const handleAddSolo = (selectedKey: string) => {
    if (!selectedKey) return;
    const item = availablePartsForSoloFeature.find((p) => p.key === selectedKey);
    if (!item) return;

    // 重複チェック
    const exists = solos.some(
      (s) => s.partName === item.part.partName && s.instrumentId === item.part.instrumentId
    );
    if (!exists) {
      setSolos((prev) => [...prev, item.part]);
    }
  };

  const handleRemoveSolo = (index: number) => {
    setSolos((prev) => prev.filter((_, i) => i !== index));
  };

  // フィーチャー追加
  const handleAddFeature = (selectedKey: string) => {
    if (!selectedKey) return;
    const item = availablePartsForSoloFeature.find((p) => p.key === selectedKey);
    if (!item) return;

    // 重複チェック
    const exists = features.some(
      (f) => f.partName === item.part.partName && f.instrumentId === item.part.instrumentId
    );
    if (!exists) {
      setFeatures((prev) => [...prev, item.part]);
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="譜面"
        icon="fa-solid fa-music"
        featureIdKey="scoreId"
        basePath="/score"
        dataId={scoreId}
        mode={mode}
        form={form}
        onSaveApi={(data) =>
          saveScore(
            mode,
            {
              ...data,
              files,
              instrumentConfig,
              solos,
              features,
            },
            scoreId,
            user?.displayName || undefined
          )
        }
      >
        <AppInput label="タイトル" required placeholder="例: Sing, Sing, Sing" {...inputProps("title")} />

        <FormField label="譜面ファイル（Storage）">
          <ScoreFileUpload files={files} onChange={setFiles} />
        </FormField>

        {/* 楽器編成（solu-navi準拠） */}
        <FormField label="楽器構成・パート構成">
          <button
            type="button"
            className={styles.allStandardBtn}
            onClick={setAllStandardParts}
          >
            <i className="fa-solid fa-wand-magic-sparkles" />
            ビッグバンド標準編成 (17パート) を一括セット
          </button>

          {allSections.map((sec) => {
            const parts = instrumentConfig[sec.id] || [];
            const sectionInstruments = allInstruments.filter((inst) => inst.sectionId === sec.id);

            return (
              <div key={sec.id} className={styles.instrumentSectionBlock}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleGroup}>
                    <div
                      className={styles.sectionColorBar}
                      style={{ backgroundColor: (sec as any).color || "#0284c7" }}
                    />
                    <h4 className={styles.sectionTitle}>{sec.name}</h4>
                    <span className={styles.partCountBadge}>{parts.length}パート</span>
                  </div>

                  <button
                    type="button"
                    className={styles.setStandardBtn}
                    onClick={() => setStandardSectionParts(sec.id)}
                  >
                    標準パート入力
                  </button>
                </div>

                {parts.map((part, partIdx) => (
                  <div key={partIdx} className={styles.partRow}>
                    <input
                      type="text"
                      value={part.partName}
                      onChange={(e) => updatePart(sec.id, partIdx, "partName", e.target.value)}
                      placeholder="パート名 (例: A1, Lead)"
                      className={styles.partInput}
                      maxLength={10}
                    />
                    <select
                      value={part.instrumentId || ""}
                      onChange={(e) => updatePart(sec.id, partIdx, "instrumentId", e.target.value)}
                      className={styles.partSelect}
                    >
                      <option value="">楽器を選択</option>
                      {sectionInstruments.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.removePartBtn}
                      onClick={() => removePart(sec.id, partIdx)}
                      title="削除"
                    >
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className={styles.addPartBtn}
                  onClick={() => addPart(sec.id)}
                >
                  <i className="fa-solid fa-plus" />
                  {sec.name}のパートを追加
                </button>
              </div>
            );
          })}
        </FormField>

        {/* ソロ・フィーチャー設定 (楽器構成から選択) */}
        <FormField label="ソロ・フィーチャー設定 (譜面マスタ)">
          <div className={styles.soloFeatureContainer}>
            {/* ソロ */}
            <div className={styles.soloFeatureCard}>
              <div className={styles.soloFeatureHeader}>
                <i className="fa-solid fa-microphone-lines" style={{ color: "#d97706" }} />
                <span className={styles.soloHeaderTitle}>ソロ (Solo)</span>
              </div>

              <div className={styles.badgeList}>
                {solos.length === 0 ? (
                  <span className={styles.emptyBadgeText}>設定されたソロパートはありません</span>
                ) : (
                  solos.map((s, idx) => {
                    const inst = allInstruments.find((i) => i.id === s.instrumentId);
                    return (
                      <span key={idx} className={`${styles.badgeItem} ${styles.soloBadgeItem}`}>
                        <span>
                          {s.partName}
                          {inst ? ` (${inst.name})` : ""}
                        </span>
                        <button
                          type="button"
                          className={styles.removeBadgeBtn}
                          onClick={() => handleRemoveSolo(idx)}
                          title="削除"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })
                )}
              </div>

              <select
                value=""
                onChange={(e) => handleAddSolo(e.target.value)}
                className={styles.addPartSelect}
                disabled={availablePartsForSoloFeature.length === 0}
              >
                <option value="">＋ ソロパートを楽器構成から追加...</option>
                {availablePartsForSoloFeature
                  .filter(
                    (p) =>
                      !solos.some(
                        (s) =>
                          s.partName === p.part.partName && s.instrumentId === p.part.instrumentId
                      )
                  )
                  .map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
              </select>
            </div>

            {/* フィーチャー */}
            <div className={styles.soloFeatureCard}>
              <div className={styles.soloFeatureHeader}>
                <i className="fa-solid fa-star" style={{ color: "#9333ea" }} />
                <span className={styles.featureHeaderTitle}>フィーチャー (Feat)</span>
              </div>

              <div className={styles.badgeList}>
                {features.length === 0 ? (
                  <span className={styles.emptyBadgeText}>設定されたFeatパートはありません</span>
                ) : (
                  features.map((f, idx) => {
                    const inst = allInstruments.find((i) => i.id === f.instrumentId);
                    return (
                      <span key={idx} className={`${styles.badgeItem} ${styles.featureBadgeItem}`}>
                        <span>
                          {f.partName}
                          {inst ? ` (${inst.name})` : ""}
                        </span>
                        <button
                          type="button"
                          className={styles.removeBadgeBtn}
                          onClick={() => handleRemoveFeature(idx)}
                          title="削除"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })
                )}
              </div>

              <select
                value=""
                onChange={(e) => handleAddFeature(e.target.value)}
                className={styles.addPartSelect}
                disabled={availablePartsForSoloFeature.length === 0}
              >
                <option value="">＋ Featパートを楽器構成から追加...</option>
                {availablePartsForSoloFeature
                  .filter(
                    (p) =>
                      !features.some(
                        (f) =>
                          f.partName === p.part.partName && f.instrumentId === p.part.instrumentId
                      )
                  )
                  .map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <p className={styles.helperNote}>
            ※ソロ・フィーチャーの選択肢は、上記の「楽器構成・パート構成」に入力されているパートから選択できます。
          </p>
        </FormField>

        <AppInput label="参考音源（YouTube URL）" required placeholder="https://www.youtube.com/..." {...inputProps("referenceTrack")} />

        <FormField label="ジャンル" required error={form.errors.genres}>
          <GenreInput
            genres={form.formData.genres}
            allGenres={allGenres}
            onChange={(val) => form.updateField("genres", val)}
          />
        </FormField>

        <AppInput label="略称(譜割用)" required placeholder="例: SSS" {...inputProps("abbreviation")} />
        <AppInput label="備考" type="textarea" placeholder="演奏上の注意点や備考があれば入力してください" {...inputProps("note")} />
        <AppInput label="ホームに表示" type="checkbox" {...inputProps("isDispTop")} />
      </EditFormLayout>
    </BaseLayout>
  );
}
