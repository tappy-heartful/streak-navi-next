"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Event, Assign, Score, User, Section } from "@/src/lib/firestore/types";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useAuth } from "@/src/contexts/AuthContext";
import styles from "./assign.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as utils from "@/src/lib/functions";
import { showSpinner, hideSpinner, showDialog, writeLog } from "@/src/lib/functions";
import { saveAssign, releaseAssign } from "@/src/features/assign/api/assign-client-service";

type Props = {
  event: Event;
  initialAssigns: Assign[];
  masterData: {
    scores: Record<string, Score>;
    users: Record<string, User>;
    sections: Record<string, Section>;
  };
};

export function AssignEditClient({ event, initialAssigns, masterData }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const { user } = useAuth();
  const router = useRouter();

  // 現在の割り当て状態を管理 { songId: { partName: userId } }
  const [currentMap, setCurrentMap] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    setBreadcrumbs([
      { title: "譜割り一覧", href: "/assign" },
      { title: "譜割り確認", href: `/assign/confirm?eventId=${event.id}` },
      { title: "譜割り編集" }
    ]);
  }, [setBreadcrumbs, event.id]);

  // 初期化: 既存のアサインをmapに展開
  useEffect(() => {
    const map: Record<string, Record<string, string>> = {};
    initialAssigns.forEach(a => {
      if (!map[a.songId]) map[a.songId] = {};
      map[a.songId][a.partName] = a.userId || "";
    });
    setCurrentMap(map);
  }, [initialAssigns]);

  // ユーザーが編集可能なパート構成 (自分の担当楽器にマッチするもの)
  const myInstrumentIds = masterData.users[user?.uid || ""]?.instrumentIds || [];
  
  const editGroups = useMemo(() => {
    const groups: Record<string, { partName: string; instrumentId?: string }[]> = {};
    if (!event.instrumentConfig) return groups;

    Object.keys(event.instrumentConfig).forEach(sectionId => {
      const parts = event.instrumentConfig![sectionId].filter(p => 
        p.instrumentId && myInstrumentIds.includes(p.instrumentId)
      );
      if (parts.length > 0) {
        groups[masterData.sections[sectionId]?.name || sectionId] = parts;
      }
    });
    return groups;
  }, [event.instrumentConfig, myInstrumentIds, masterData.sections]);

  // 楽器ごとの選択可能なユーザーリスト
  const usersByInstrument = useMemo(() => {
    const map: Record<string, User[]> = {};
    Object.values(masterData.users).forEach(u => {
      u.instrumentIds?.forEach(instId => {
        if (!map[instId]) map[instId] = [];
        map[instId].push(u);
      });
    });
    // 名前順でソート
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "ja"));
    });
    return map;
  }, [masterData.users]);

  // 変更処理
  const handleChange = (songId: string, partName: string, userId: string) => {
    setCurrentMap(prev => ({
      ...prev,
      [songId]: {
        ...(prev[songId] || {}),
        [partName]: userId
      }
    }));
  };

  // 保存
  const handleSave = async () => {
    if (!(await showDialog("譜割りを更新しますか？"))) return;

    showSpinner();
    try {
      // 変更があったものを特定
      const promises: Promise<any>[] = [];
      const initialMap: Record<string, Record<string, string>> = {};
      initialAssigns.forEach(a => {
        if (!initialMap[a.songId]) initialMap[a.songId] = {};
        initialMap[a.songId][a.partName] = a.userId || "";
      });

      // 現状のmapを走査
      for (const songId in currentMap) {
        for (const partName in currentMap[songId]) {
          const newVal = currentMap[songId][partName];
          const oldVal = initialMap[songId]?.[partName] || "";

          if (newVal !== oldVal) {
            if (newVal === "") {
              promises.push(releaseAssign(event.id, songId, partName));
            } else {
              const u = masterData.users[newVal];
              promises.push(saveAssign(event.id, songId, partName, {
                userId: newVal,
                assignValue: u?.abbreviation || u?.displayName || "？",
                isRehearsal: false // 編集画面からは演奏メンバーとして保存
              }));
            }
          }
        }
      }

      await Promise.all(promises);
      await writeLog({ dataId: event.id, action: "譜割り更新" });
      await showDialog("更新しました", true);
      router.refresh();
      router.push(`/assign/confirm?eventId=${event.id}`);
      router.refresh(); // Server Componentsの再検証
    } catch (e) {
      console.error(e);
      await writeLog({ dataId: event.id, action: "譜割り更新", status: "error", errorDetail: { message: (e as Error).message } });
      await showDialog("更新に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  if (Object.keys(editGroups).length === 0) {
    return (
      <BaseLayout>
        <div className="container">
          <p className={styles.emptyMessage}>
            このイベントには、あなたの担当楽器のパートが設定されていません。
          </p>
          <div style={{ textAlign: "center" }}>
            <Link href={`/assign/confirm?eventId=${event.id}`} className="back-link">← 戻る</Link>
          </div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <div className="page-header">
        <h1><i className="fa-solid fa-edit" /> 譜割り編集</h1>
      </div>

      <div className="container">
        <div className={styles.topControls}>
          <div className={styles.eventInfo}>
            <span className={styles.eventTitle}>{event.title}</span>
            <span className={styles.eventDate}>{event.date || "日付未定"}</span>
          </div>
        </div>

        <div className={styles.tableViewWrapper}>
          <div className={styles.tableResponsive}>
            <table className={styles.assignTable}>
              <thead>
                <tr>
                  <th rowSpan={2} className={styles.songHeader}>曲名</th>
                  {Object.entries(editGroups).map(([sectionName, parts]) => (
                    <th key={sectionName} colSpan={parts.length} className={styles.sectionNameHeader}>
                      {sectionName}
                    </th>
                  ))}
                </tr>
                <tr>
                  {Object.values(editGroups).flatMap(parts => 
                    parts.map(p => <th key={p.partName} className={styles.partHeaderCell}>{p.partName}</th>)
                  )}
                </tr>
              </thead>
              <tbody>
                {event.setlist?.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    <tr className={styles.groupTitleRow}>
                      <td colSpan={Object.values(editGroups).reduce((acc, p) => acc + p.length, 0) + 1}>
                        {group.title}
                      </td>
                    </tr>
                    {group.songIds.map(songId => {
                      const score = masterData.scores[songId];
                      if (!score) return null;
                      return (
                        <tr key={songId}>
                          <td className={styles.songHeader}>
                            {score.abbreviation || score.title}
                          </td>
                          {Object.values(editGroups).flatMap(parts => 
                            parts.map(p => {
                              const val = currentMap[songId]?.[p.partName] || "";
                              const candidates = p.instrumentId ? (usersByInstrument[p.instrumentId] || []) : [];
                              return (
                                <td key={p.partName} className={styles.assignCell}>
                                  <select 
                                    className={styles.assignSelect}
                                    value={val}
                                    onChange={e => handleChange(songId, p.partName, e.target.value)}
                                  >
                                    <option value="">ー</option>
                                    {candidates.map(u => (
                                      <option key={u.id} value={u.id}>
                                        {u.abbreviation || u.displayName}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              );
                            })
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="confirm-buttons" style={{ marginTop: "30px", textAlign: "center", display: "flex", justifyContent: "center", gap: "20px" }}>
          <button className={styles.clearButton} onClick={() => router.refresh()}>
            編集前に戻す
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            更新する
          </button>
        </div>

        <div className="page-footer" style={{ marginTop: "30px" }}>
          <Link href={`/assign/confirm?eventId=${event.id}`} className="back-link">← キャンセルして戻る</Link>
        </div>
      </div>
    </BaseLayout>
  );
}
