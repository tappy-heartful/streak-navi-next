"use client";

import React, { useState, useEffect } from "react";
import { EventSolo, Score } from "@/src/lib/firestore/types";
import styles from "./SoloFeatureModal.module.css";

interface SetlistGroupItem {
  title: string;
  songIds: string[];
}

interface SoloFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  setlistGroups: SetlistGroupItem[];
  scores: Score[];
  availableParts: string[];
  solos: EventSolo[];
  features: EventSolo[];
  onSave: (newSolos: EventSolo[], newFeatures: EventSolo[]) => void;
}

export function SoloFeatureModal({
  isOpen,
  onClose,
  setlistGroups,
  scores,
  availableParts,
  solos,
  features,
  onSave,
}: SoloFeatureModalProps) {
  const [localSolos, setLocalSolos] = useState<EventSolo[]>(solos);
  const [localFeatures, setLocalFeatures] = useState<EventSolo[]>(features);

  // モーダルを開くたびにPropsの値を同期
  useEffect(() => {
    if (isOpen) {
      setLocalSolos(solos);
      setLocalFeatures(features);
    }
  }, [isOpen, solos, features]);

  // Escキーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ソロ追加
  const handleAddSolo = (songId: string, partName: string) => {
    if (!songId || !partName) return;
    setLocalSolos(prev => {
      if (prev.some(s => s.songId === songId && s.partName === partName)) return prev;
      return [...prev, { songId, partName }];
    });
  };

  // ソロ削除
  const handleRemoveSolo = (songId: string, partName: string) => {
    setLocalSolos(prev => prev.filter(s => !(s.songId === songId && s.partName === partName)));
  };

  // フィーチャー追加
  const handleAddFeature = (songId: string, partName: string) => {
    if (!songId || !partName) return;
    setLocalFeatures(prev => {
      if (prev.some(f => f.songId === songId && f.partName === partName)) return prev;
      return [...prev, { songId, partName }];
    });
  };

  // フィーチャー削除
  const handleRemoveFeature = (songId: string, partName: string) => {
    setLocalFeatures(prev => prev.filter(f => !(f.songId === songId && f.partName === partName)));
  };

  // 譜面マスタからソロ・Featを読み込む
  const handleLoadFromScores = () => {
    const allSongIds = Array.from(new Set(setlistGroups.flatMap(g => g.songIds).filter(Boolean)));
    const targetScores = allSongIds.map(id => scoreMap.get(id)).filter((s): s is Score => !!s);

    const newSolos: EventSolo[] = [];
    const newFeatures: EventSolo[] = [];

    targetScores.forEach(score => {
      (score.solos || []).forEach(s => {
        const pName = s.partName.trim();
        if (pName && !newSolos.some(exist => exist.songId === score.id && exist.partName === pName)) {
          newSolos.push({ songId: score.id, partName: pName });
        }
      });
      (score.features || []).forEach(f => {
        const pName = f.partName.trim();
        if (pName && !newFeatures.some(exist => exist.songId === score.id && exist.partName === pName)) {
          newFeatures.push({ songId: score.id, partName: pName });
        }
      });
    });

    setLocalSolos(newSolos);
    setLocalFeatures(newFeatures);
  };

  // 保存処理
  const handleSave = () => {
    onSave(localSolos, localFeatures);
    onClose();
  };

  // スコアのマップ
  const scoreMap = new Map<string, Score>();
  scores.forEach(s => scoreMap.set(s.id, s));

  // セットリスト全体の有効な曲ID数
  const totalSongsCount = setlistGroups.reduce((acc, g) => acc + g.songIds.filter(Boolean).length, 0);

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="solo-feature-modal-title"
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.titleArea}>
            <i className={`fa-solid fa-star ${styles.headerIcon}`} />
            <h2 id="solo-feature-modal-title" className={styles.modalTitle}>
              ソロ・フィーチャー設定
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeIconButton}
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className={styles.modalSubHeader}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <span>
              セットリストの各曲に対して、ソロパートやフィーチャー（Feat）パートを設定できます。<br />
              プルダウンからパートを選択して追加してください（1曲に複数設定可能）。
            </span>
            {totalSongsCount > 0 && availableParts.length > 0 && (
              <button
                type="button"
                className="add-choice"
                style={{
                  width: "auto",
                  padding: "5px 12px",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  backgroundColor: "#f0f9ff",
                  borderColor: "#0284c7",
                  color: "#0284c7",
                }}
                onClick={handleLoadFromScores}
                title="セットリストの各譜面マスタに設定されているソロ・Featパートをこのモーダルに読み込みます"
              >
                <i className="fa-solid fa-wand-magic-sparkles" /> 譜面マスタからソロ・Featを読み込む
              </button>
            )}
          </div>
        </div>

        <div className={styles.modalBody}>
          {totalSongsCount === 0 ? (
            <div className={styles.emptyState}>
              <i className="fa-solid fa-music" style={{ fontSize: "28px", color: "#cbd5e1", marginBottom: "8px", display: "block" }} />
              セットリストに曲が登録されていません。<br />先にセットリストに曲を追加してください。
            </div>
          ) : availableParts.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="fa-solid fa-guitar" style={{ fontSize: "28px", color: "#cbd5e1", marginBottom: "8px", display: "block" }} />
              楽器構成にパートが登録されていません。<br />先に楽器構成（パート名）を設定してください。
            </div>
          ) : (
            setlistGroups.map((group, gIdx) => {
              const validSongIds = group.songIds.filter(Boolean);
              if (validSongIds.length === 0) return null;

              return (
                <div key={gIdx} className={styles.groupBlock}>
                  <div className={styles.groupTitle}>
                    <i className="fa-solid fa-layer-group" style={{ fontSize: "11px" }} />
                    <span>{group.title || `第${gIdx + 1}ステージ`}</span>
                  </div>

                  {validSongIds.map(songId => {
                    const score = scoreMap.get(songId);
                    const songName = score?.abbreviation || score?.title || "曲名不明";
                    const isAbbrDiff = score?.abbreviation && score.abbreviation !== score.title;

                    const songSolos = localSolos.filter(s => s.songId === songId);
                    const songFeatures = localFeatures.filter(f => f.songId === songId);

                    return (
                      <div key={songId} className={styles.songCard}>
                        <div className={styles.songCardHeader}>
                          <div>
                            <span className={styles.songName}>{songName}</span>
                            {isAbbrDiff && (
                              <span className={styles.songFullName}>({score?.title})</span>
                            )}
                          </div>
                        </div>

                        {/* ソロ設定 */}
                        <div className={styles.settingRow}>
                          <span className={`${styles.rowLabel} ${styles.soloLabel}`}>
                            <i className="fa-solid fa-music" /> ソロ (Solo)
                          </span>
                          <div className={styles.badgeList}>
                            {songSolos.map(s => (
                              <span key={s.partName} className={`${styles.badgeItem} ${styles.soloBadgeItem}`}>
                                <span>{s.partName}</span>
                                <button
                                  type="button"
                                  className={styles.removeBadgeBtn}
                                  onClick={() => handleRemoveSolo(songId, s.partName)}
                                  title="削除"
                                >
                                  ×
                                </button>
                              </span>
                            ))}

                            <div className={styles.selectWrapper}>
                              <select
                                className={styles.partSelect}
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddSolo(songId, e.target.value);
                                  }
                                }}
                              >
                                <option value="">＋ ソロパートを追加...</option>
                                {availableParts
                                  .filter(p => !songSolos.some(s => s.partName === p))
                                  .map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* フィーチャー設定 */}
                        <div className={styles.settingRow}>
                          <span className={`${styles.rowLabel} ${styles.featureLabel}`}>
                            <i className="fa-solid fa-star" /> フィーチャー (Feat)
                          </span>
                          <div className={styles.badgeList}>
                            {songFeatures.map(f => (
                              <span key={f.partName} className={`${styles.badgeItem} ${styles.featureBadgeItem}`}>
                                <span>{f.partName}</span>
                                <button
                                  type="button"
                                  className={styles.removeBadgeBtn}
                                  onClick={() => handleRemoveFeature(songId, f.partName)}
                                  title="削除"
                                >
                                  ×
                                </button>
                              </span>
                            ))}

                            <div className={styles.selectWrapper}>
                              <select
                                className={styles.partSelect}
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddFeature(songId, e.target.value);
                                  }
                                }}
                              >
                                <option value="">＋ Featパートを追加...</option>
                                {availableParts
                                  .filter(p => !songFeatures.some(f => f.partName === p))
                                  .map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            キャンセル
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            設定を反映する
          </button>
        </div>
      </div>
    </div>
  );
}

