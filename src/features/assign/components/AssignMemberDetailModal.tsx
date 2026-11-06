"use client";

import React, { useEffect } from "react";
import { Score, User } from "@/src/lib/firestore/types";
import styles from "./AssignMemberDetailModal.module.css";

export interface MemberSongAssign {
  songId: string;
  songTitle: string;
  songAbbreviation?: string;
  groupTitle?: string;
  partName: string;
  isSolo: boolean;
  isFeature: boolean;
  score?: Score;
}

interface AssignMemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  user?: User;
  assignedSongs: MemberSongAssign[];
}

export function AssignMemberDetailModal({
  isOpen,
  onClose,
  memberName,
  assignedSongs,
}: AssignMemberDetailModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const soloCount = assignedSongs.filter(s => s.isSolo).length;
  const featureCount = assignedSongs.filter(s => s.isFeature).length;

  // グループ（部/ステージ）ごとにまとめる
  const groupedSongs: { groupTitle: string; songs: MemberSongAssign[] }[] = [];
  assignedSongs.forEach(song => {
    const gTitle = song.groupTitle || "セットリスト";
    let group = groupedSongs.find(g => g.groupTitle === gTitle);
    if (!group) {
      group = { groupTitle: gTitle, songs: [] };
      groupedSongs.push(group);
    }
    group.songs.push(song);
  });

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-modal-title"
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.titleArea}>
            <i className={`fa-solid fa-user-music ${styles.headerIcon}`} />
            <h2 id="member-modal-title" className={styles.modalTitle}>
              {memberName} の担当曲
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
          <span className={styles.totalSongsBadge}>
            担当 {assignedSongs.length}曲
          </span>
          {soloCount > 0 && (
            <span className={styles.totalSoloBadge}>
              <i className="fa-solid fa-music" style={{ fontSize: "10px" }} />
              ソロ {soloCount}曲
            </span>
          )}
          {featureCount > 0 && (
            <span className={styles.totalFeatureBadge}>
              <i className="fa-solid fa-star" style={{ fontSize: "10px" }} />
              Feat {featureCount}曲
            </span>
          )}
        </div>

        <div className={styles.modalBody}>
          {assignedSongs.length === 0 ? (
            <div className={styles.emptyState}>
              このイベントでの担当曲はありません。
            </div>
          ) : (
            groupedSongs.map(group => (
              <div key={group.groupTitle} className={styles.songGroup}>
                <div className={styles.groupTitle}>
                  <i className="fa-solid fa-layer-group" style={{ fontSize: "11px", opacity: 0.7 }} />
                  <span>{group.groupTitle}</span>
                </div>
                <div className={styles.songList}>
                  {group.songs.map((song, idx) => (
                    <div
                      key={`${song.songId}_${song.partName}_${idx}`}
                      className={`${styles.songCard} ${song.isFeature ? styles.isFeatureCard : song.isSolo ? styles.isSoloCard : ""}`}
                    >
                      <div className={styles.songInfo}>
                        <div className={styles.songMainName}>
                          {song.songAbbreviation || song.songTitle}
                        </div>
                        {song.songAbbreviation && song.songAbbreviation !== song.songTitle && (
                          <div className={styles.songFullName}>
                            {song.songTitle}
                          </div>
                        )}
                      </div>
                      <div className={styles.badgesArea}>
                        <span className={styles.partBadge}>{song.partName}</span>
                        {song.isFeature && (
                          <span className={styles.featureBadge}>Feat</span>
                        )}
                        {song.isSolo && (
                          <span className={styles.soloBadge}>Solo</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

