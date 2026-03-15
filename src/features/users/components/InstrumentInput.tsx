"use client";

import { useMemo, useState } from "react";
import { Instrument } from "@/src/lib/firestore/types";
import styles from "./instrument.module.css";

type Props = {
  selectedSectionId: string;
  selectedInstrumentIds: string[];
  allInstruments: Instrument[];
  onChange: (ids: string[]) => void;
};

export function InstrumentInput({ selectedSectionId, selectedInstrumentIds, allInstruments, onChange }: Props) {
  const [showOthers, setShowOthers] = useState(false);

  // 1. 推奨楽器（選択されたパートの楽器）とその他の楽器に分ける
  const { recommended, others } = useMemo(() => {
    const recFiles: Instrument[] = [];
    const othFiles: Instrument[] = [];

    // allInstrumentsは予め全件ソートされて渡ってくると想定
    for (const inst of Object.values(allInstruments)) {
      if (inst.sectionId === selectedSectionId) {
        recFiles.push(inst);
      } else {
        othFiles.push(inst);
      }
    }
    return { recommended: recFiles, others: othFiles };
  }, [allInstruments, selectedSectionId]);

  // その他の楽器に、すでに選択されているものがあるかどうか
  const hasSelectedOthers = useMemo(() => {
    return others.some((inst) => selectedInstrumentIds.includes(inst.id));
  }, [others, selectedInstrumentIds]);

  // 初回レンダリング時、その他の楽器が選択されていれば自動展開する
  const isOthersExpanded = showOthers || hasSelectedOthers;

  if (!selectedSectionId) {
    return <div className="text-muted" style={{ padding: "0.5rem" }}>--- パートを選択してください ---</div>;
  }

  const toggleInstrument = (instId: string) => {
    if (selectedInstrumentIds.includes(instId)) {
      onChange(selectedInstrumentIds.filter((id) => id !== instId));
    } else {
      onChange([...selectedInstrumentIds, instId]);
    }
  };

  const renderCheckboxes = (list: Instrument[]) => {
    return list.map((inst) => (
      <label key={inst.id} className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={selectedInstrumentIds.includes(inst.id)}
          onChange={() => toggleInstrument(inst.id)}
        />
        <span className={styles.checkboxText}>{inst.name || "(名称なし)"}</span>
      </label>
    ));
  };

  return (
    <div className={styles.instrumentContainer}>
      {recommended.length > 0 ? (
        <div className={styles.checkboxGroup}>
          {renderCheckboxes(recommended)}
        </div>
      ) : (
        <div className="text-muted" style={{ padding: "0.5rem 0" }}>推奨楽器はありません</div>
      )}

      {others.length > 0 && (
        <div className={styles.othersContainer}>
          {isOthersExpanded ? (
            <div className={styles.checkboxGroup}>
              <div className={styles.othersDivider}>その他の楽器</div>
              {renderCheckboxes(others)}
            </div>
          ) : (
            <button
              type="button"
              className={styles.toggleButton}
              onClick={() => setShowOthers(true)}
            >
              ＋ ほかの楽器も選ぶ
            </button>
          )}
        </div>
      )}
    </div>
  );
}
