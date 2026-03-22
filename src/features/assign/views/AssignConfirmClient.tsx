"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Event, Assign, Score, User, Section } from "@/src/lib/firestore/types";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useAuth } from "@/src/contexts/AuthContext";
import styles from "./assign.module.css";
import Link from "next/link";
import * as utils from "@/src/lib/functions";

type Props = {
  event: Event;
  assigns: Assign[];
  masterData: {
    scores: Record<string, Score>;
    users: Record<string, User>;
    sections: Record<string, Section>;
  };
};

export function AssignConfirmClient({ event, assigns, masterData }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    setBreadcrumbs([
      { title: "譜割り一覧", href: "/assign" },
      { title: "譜割り確認" }
    ]);
  }, [setBreadcrumbs]);

  // 初期タブ設定
  useEffect(() => {
    if (event.instrumentConfig) {
      const sectionIds = Object.keys(event.instrumentConfig);
      if (sectionIds.length > 0) {
        // セッションやユーザーの所属セクションに合わせるロジックがあればここで
        const mySectionId = masterData.users[user?.uid || ""]?.sectionId;
        if (mySectionId && event.instrumentConfig[mySectionId]) {
          setActiveTab(mySectionId);
        } else {
          setActiveTab(sectionIds[0]);
        }
      }
    }
  }, [event.instrumentConfig, user, masterData.users]);

  // YouTubeプレイリストURL
  const playlistUrl = useMemo(() => {
    const videoIds = new Set<string>();
    event.setlist?.forEach(group => {
      group.songIds.forEach(songId => {
        const score = masterData.scores[songId];
        if (score?.referenceTrack) {
          const id = utils.extractYouTubeId(score.referenceTrack);
          if (id) videoIds.add(id);
        }
      });
    });
    if (videoIds.size === 0) return null;
    return `https://www.youtube.com/watch_videos?video_ids=${Array.from(videoIds).join(",")}`;
  }, [event.setlist, masterData.scores]);

  // 補助データ: セクションIDごとの所属ユーザー
  const usersBySection = useMemo(() => {
    const map: Record<string, User[]> = {};
    Object.values(masterData.users).forEach(u => {
      if (u.sectionId) {
        if (!map[u.sectionId]) map[u.sectionId] = [];
        map[u.sectionId].push(u);
      }
    });
    return map;
  }, [masterData.users]);

  // 譜割り集計用
  const summaryData = useMemo(() => {
    const summary: Record<string, Record<string, number>> = {};
    const sectionIds = event.instrumentConfig ? Object.keys(event.instrumentConfig) : [];

    sectionIds.forEach(sectionId => {
      const sectionName = masterData.sections[sectionId]?.name || "Unknown";
      const partConfigs = event.instrumentConfig![sectionId];
      const counts: Record<string, number> = {};

      assigns.forEach(a => {
        // 現在のセクションのパ―トに含まれているか
        const isPartInThisSection = partConfigs.some(p => p.partName === a.partName);
        if (isPartInThisSection) {
          const name = a.assignValue || "？";
          counts[name] = (counts[name] || 0) + 1;
        }
      });
      summary[sectionId] = counts;
    });
    return summary;
  }, [event.instrumentConfig, assigns, masterData.sections]);

  if (!event.instrumentConfig || Object.keys(event.instrumentConfig).length === 0) {
    return (
      <BaseLayout>
        <div className="container">
          <p className={styles.emptyMessage}>楽器パートが設定されていません。</p>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <div className="container">
        <div className="page-header">
          <h1><i className="fa-solid fa-clipboard-list" /> 譜割り確認</h1>
        </div>

        <div className={styles.topControls}>
          <div className={styles.eventInfo}>
            <Link href={`/event/confirm?eventId=${event.id}`} target="_blank" className={styles.eventTitle}>
              {event.title}
            </Link>
            <span className={styles.eventDate}>{event.date || "日付未定"}</span>
          </div>
          {playlistUrl && (
            <div className={styles.referenceTrackLink}>
              <a href={playlistUrl} target="_blank" rel="noreferrer">
                <i className="fa-brands fa-youtube" /> 参考音源プレイリスト
              </a>
            </div>
          )}
        </div>

        <div className={styles.tableViewWrapper}>
          <div className={styles.tabButtons}>
            {Object.keys(event.instrumentConfig).map(sectionId => (
              <button
                key={sectionId}
                className={`${styles.tabButton} ${activeTab === sectionId ? styles.active : ""}`}
                onClick={() => setActiveTab(sectionId)}
              >
                {masterData.sections[sectionId]?.name || sectionId}
              </button>
            ))}
          </div>

          <div className={styles.tableResponsive}>
            <table className={styles.assignTable}>
              <thead>
                <tr>
                  <th className={styles.songHeader}>曲名</th>
                  {event.instrumentConfig[activeTab]?.map(p => (
                    <th key={p.partName}>{p.partName}</th>
                  ))}
                  <th className={styles.rehearsalHeader}>控え</th>
                </tr>
              </thead>
              <tbody>
                {event.setlist?.map((group, idx) => (
                  <React.Fragment key={idx}>
                    <tr className={styles.groupTitleRow}>
                      <td colSpan={(event.instrumentConfig![activeTab]?.length || 0) + 2}>
                        {group.title}
                      </td>
                    </tr>
                    {group.songIds.map(songId => {
                      const score = masterData.scores[songId];
                      if (!score) return null;
                      
                      // この曲・このセクションにアサインされているユーザーID
                      const assignedUserIds = new Set(
                        assigns.filter(a => a.songId === songId).map(a => a.userId).filter(Boolean) as string[]
                      );

                      // 控えメンバー（セクションメンバーのうち、この曲にアサインされていない人）
                      const unassignedNames = (usersBySection[activeTab] || [])
                        .filter(u => !assignedUserIds.has(u.id))
                        .map(u => u.abbreviation || u.displayName || "？")
                        .sort()
                        .join("、");

                      return (
                        <tr key={songId}>
                          <td className={styles.songHeader}>
                            {score.scoreUrl ? (
                              <a href={score.scoreUrl} target="_blank" rel="noreferrer">
                                {score.abbreviation || score.title}
                              </a>
                            ) : (
                              score.abbreviation || score.title
                            )}
                          </td>
                          {event.instrumentConfig![activeTab]?.map(p => {
                            const a = assigns.find(a => a.songId === songId && a.partName === p.partName);
                            return (
                              <td key={p.partName} className={styles.assignCell}>
                                {a?.assignValue || "ー"}
                              </td>
                            );
                          })}
                          <td className={styles.unassignedCell}>
                            {unassignedNames || "ー"}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.summaryWrapper}>
          <div className={styles.summarySection}>
            <h3>{masterData.sections[activeTab]?.name} 小計</h3>
            <ul className={styles.summaryList}>
              {Object.entries(summaryData[activeTab] || {})
                .sort(([a], [b]) => a.localeCompare(b, "ja"))
                .map(([name, count]) => (
                  <li key={name} className={styles.summaryItem}>
                    {name}：<strong>{count}</strong>曲
                  </li>
                ))}
              {Object.keys(summaryData[activeTab] || {}).length === 0 && (
                <li className={styles.summaryItem}>割り当てはありません</li>
              )}
            </ul>
          </div>
        </div>

        <div style={{ marginTop: "30px", textAlign: "center" }}>
          <Link href={`/assign/edit?eventId=${event.id}`} className={styles.editButton}>
            編集画面へ
          </Link>
        </div>
      </div>

      <div className="page-footer">
        <Link href="/assign" className="back-link">← 譜割り一覧に戻る</Link>
      </div>
    </BaseLayout>
  );
}
