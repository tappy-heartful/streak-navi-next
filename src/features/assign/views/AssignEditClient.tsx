"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Event, Assign, Score, User, Section, Instrument } from "@/src/lib/firestore/types";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useAuth } from "@/src/contexts/AuthContext";
import styles from "./assign.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormFooter } from "@/src/components/Form/FormFooter";
import * as utils from "@/src/lib/functions";
import { showSpinner, hideSpinner, showDialog, writeLog } from "@/src/lib/functions";
import { saveAssign, releaseAssign } from "@/src/features/assign/api/assign-client-service";
import { AssignMemberDetailModal, MemberSongAssign } from "@/src/features/assign/components/AssignMemberDetailModal";
import { getPastAssignHistory } from "@/src/features/assign/api/assign-server-actions";

type Props = {
  event: Event;
  initialAssigns: Assign[];
  masterData: {
    scores: Record<string, Score>;
    users: Record<string, User>;
    sections: Record<string, Section>;
    instruments?: Record<string, Instrument>;
  };
};

export function AssignEditClient({ event, initialAssigns, masterData }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const { user, userData } = useAuth();
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

  // ソロ判定用のSet (songId__partName)
  const solosSet = useMemo(() => {
    return new Set((event.solos || []).map(s => `${s.songId}__${s.partName}`));
  }, [event.solos]);

  // フィーチャー判定用のSet (songId__partName)
  const featuresSet = useMemo(() => {
    return new Set((event.features || []).map(f => `${f.songId}__${f.partName}`));
  }, [event.features]);

  // 譜割り集計用（リアルタイム計算：currentMapの変更に連動）
  const sectionSummaries = useMemo(() => {
    interface MemberSummary {
      name: string;
      userId?: string;
      count: number;
      soloCount: number;
      featureCount: number;
      instrumentId: string;
      instrumentName: string;
      instrumentOrder: number;
    }

    interface InstrumentGroup {
      instrumentId: string;
      instrumentName: string;
      instrumentOrder: number;
      members: MemberSummary[];
    }

    const result: Record<string, InstrumentGroup[]> = {};
    const sectionIds = event.instrumentConfig ? Object.keys(event.instrumentConfig) : [];
    const songIds = new Set(event.setlist?.flatMap(g => g.songIds) || []);
    const instrumentsMap = masterData.instruments || {};

    sectionIds.forEach(sectionId => {
      const partConfigs = event.instrumentConfig![sectionId] || [];
      const partNames = new Set(partConfigs.map(p => p.partName));

      // このセクションでのパート別 instrumentId マップ
      const partInstrumentMap: Record<string, string> = {};
      const partInstrumentOrder: Record<string, number> = {};
      let instOrderIdx = 0;
      partConfigs.forEach(p => {
        if (p.instrumentId) {
          partInstrumentMap[p.partName] = p.instrumentId;
          if (partInstrumentOrder[p.instrumentId] === undefined) {
            partInstrumentOrder[p.instrumentId] = instOrderIdx++;
          }
        }
      });

      // メンバーごとの集計用マップ
      const memberMap: Record<string, {
        name: string;
        userId?: string;
        count: number;
        soloCount: number;
        featureCount: number;
        matchedUser?: User;
        playedPartNames: Set<string>;
      }> = {};

      // currentMap から集計
      songIds.forEach(songId => {
        const songParts = currentMap[songId] || {};
        partConfigs.forEach(p => {
          const userId = songParts[p.partName];
          if (userId && userId !== "ー") {
            const userObj = masterData.users[userId];
            const name = userObj ? (userObj.abbreviation || userObj.displayName || "？") : userId;

            if (!memberMap[userId]) {
              memberMap[userId] = {
                name,
                userId,
                count: 0,
                soloCount: 0,
                featureCount: 0,
                matchedUser: userObj,
                playedPartNames: new Set(),
              };
            }

            memberMap[userId].count += 1;
            memberMap[userId].playedPartNames.add(p.partName);

            if (solosSet.has(`${songId}__${p.partName}`)) {
              memberMap[userId].soloCount += 1;
            }
            if (featuresSet.has(`${songId}__${p.partName}`)) {
              memberMap[userId].featureCount += 1;
            }
          }
        });
      });

      // 各メンバーの楽器を特定
      const members: MemberSummary[] = Object.values(memberMap).map(m => {
        let instId = "";
        if (m.matchedUser?.instrumentIds && m.matchedUser.instrumentIds.length > 0) {
          const matchSecInst = m.matchedUser.instrumentIds.find(id => instrumentsMap[id]?.sectionId === sectionId);
          if (matchSecInst) {
            instId = matchSecInst;
          } else if (m.matchedUser.instrumentIds[0]) {
            instId = m.matchedUser.instrumentIds[0];
          }
        }

        if (!instId) {
          for (const pName of m.playedPartNames) {
            if (partInstrumentMap[pName]) {
              instId = partInstrumentMap[pName];
              break;
            }
          }
        }

        const inst = instrumentsMap[instId];
        const instName = inst?.name || "その他";

        let order = 99999;
        if (instId && partInstrumentOrder[instId] !== undefined) {
          order = partInstrumentOrder[instId];
        } else if (instId && inst) {
          order = 1000 + (parseInt(instId, 10) || 0);
        }

        return {
          name: m.name,
          userId: m.userId,
          count: m.count,
          soloCount: m.soloCount,
          featureCount: m.featureCount,
          instrumentId: instId || "other",
          instrumentName: instName,
          instrumentOrder: order,
        };
      });

      // 楽器ごとにグループ化
      const groupsMap: Record<string, InstrumentGroup> = {};
      members.forEach(m => {
        const key = m.instrumentId || "other";
        if (!groupsMap[key]) {
          groupsMap[key] = {
            instrumentId: key,
            instrumentName: m.instrumentName,
            instrumentOrder: m.instrumentOrder,
            members: [],
          };
        }
        groupsMap[key].members.push(m);
      });

      // 各グループ内のメンバーを名前順ソート
      const groups = Object.values(groupsMap).map(g => {
        g.members.sort((a, b) => a.name.localeCompare(b.name, "ja"));
        return g;
      });

      // グループを楽器順にソート
      groups.sort((a, b) => {
        if (a.instrumentOrder !== b.instrumentOrder) {
          return a.instrumentOrder - b.instrumentOrder;
        }
        return a.instrumentName.localeCompare(b.instrumentName, "ja");
      });

      result[sectionId] = groups;
    });

    return result;
  }, [event.instrumentConfig, event.setlist, currentMap, masterData.instruments, masterData.users, solosSet, featuresSet]);

  // 自分のセクションとセクション一覧
  const mySectionId = user?.uid ? (masterData.users[user.uid]?.sectionId || userData?.sectionId) : undefined;
  const sectionIds = useMemo(() => {
    return event.instrumentConfig ? Object.keys(event.instrumentConfig) : [];
  }, [event.instrumentConfig]);

  const primarySectionId = useMemo(() => {
    if (mySectionId && sectionIds.includes(mySectionId)) {
      return mySectionId;
    }
    return sectionIds[0] || "";
  }, [mySectionId, sectionIds]);

  const otherSectionIds = useMemo(() => {
    return sectionIds.filter(id => id !== primarySectionId);
  }, [sectionIds, primarySectionId]);

  // メンバー詳細モーダル用ステート
  const [selectedMemberModal, setSelectedMemberModal] = useState<{ name: string; userId?: string } | null>(null);

  // 選択中メンバーの担当曲リスト（currentMapとリアルタイム連動）
  const memberAssignedSongs = useMemo(() => {
    if (!selectedMemberModal) return [];

    const result: MemberSongAssign[] = [];
    const targetName = selectedMemberModal.name;
    const targetUid = selectedMemberModal.userId;

    event.setlist?.forEach(group => {
      group.songIds?.forEach(songId => {
        const score = masterData.scores[songId];
        const songParts = currentMap[songId] || {};

        Object.entries(songParts).forEach(([partName, userId]) => {
          if (!userId || userId === "ー") return;
          const userObj = masterData.users[userId];
          const userName = userObj ? (userObj.abbreviation || userObj.displayName || "？") : userId;

          const isMatch = (targetUid && userId === targetUid) || userName === targetName;
          if (isMatch) {
            result.push({
              songId,
              songTitle: score?.title || "曲名不明",
              songAbbreviation: score?.abbreviation,
              groupTitle: group.title,
              partName,
              isSolo: solosSet.has(`${songId}__${partName}`),
              isFeature: featuresSet.has(`${songId}__${partName}`),
              score,
            });
          }
        });
      });
    });

    return result;
  }, [selectedMemberModal, event.setlist, currentMap, masterData.scores, masterData.users, solosSet, featuresSet]);

  // セクション小計レンダリング関数
  const renderSectionSummary = (secId: string) => {
    const groups = sectionSummaries[secId] || [];
    if (groups.length === 0) {
      return <p className={styles.emptySummary}>割り当てはありません</p>;
    }

    return (
      <div className={styles.instrumentGroupsContainer}>
        {groups.map(group => (
          <div key={group.instrumentId} className={styles.instrumentGroup}>
            <div className={styles.instrumentGroupTitle}>
              <i className="fa-solid fa-tag" style={{ fontSize: "11px", opacity: 0.7 }} />
              <span>{group.instrumentName}</span>
            </div>
            <ul className={styles.summaryList}>
              {group.members.map(m => (
                <li key={m.name} className={styles.summaryItem}>
                  <button
                    type="button"
                    className={styles.summaryMemberButton}
                    onClick={() => setSelectedMemberModal({ name: m.name, userId: m.userId })}
                    title={`${m.name}の担当曲とソロを表示`}
                  >
                    <span>{m.name}</span>
                    <i className="fa-solid fa-circle-info" aria-hidden="true" />
                  </button>
                  <span className={styles.summaryCountGroup}>
                    <span className={styles.songCount}><strong>{m.count}</strong>曲</span>
                    <span className={`${styles.soloCount} ${m.soloCount > 0 ? styles.hasSolo : ""}`}>
                      (ソロ <strong>{m.soloCount}</strong>曲)
                    </span>
                    {m.featureCount > 0 && (
                      <span className={`${styles.featureCount} ${styles.hasFeature}`}>
                        (Feat <strong>{m.featureCount}</strong>曲)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

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

  // 過去の譜割りから自動入力
  const handleAutoAssignFromHistory = async () => {
    const confirmed = await showDialog(
      "過去の実績（演奏回数・直近の演奏曲）に基づいて、担当可能なパートの譜割りを自動入力しますか？"
    );
    if (!confirmed) return;

    showSpinner();
    try {
      const pastRecords = await getPastAssignHistory(event.id);
      if (pastRecords.length === 0) {
        hideSpinner();
        await showDialog("過去のイベントの譜割り履歴が見つかりませんでした。", true);
        return;
      }

      // 自分が編集可能なパート一覧
      const editablePartsList: { partName: string; instrumentId?: string }[] = [];
      Object.values(editGroups).forEach(parts => {
        parts.forEach(p => editablePartsList.push(p));
      });

      if (editablePartsList.length === 0) {
        hideSpinner();
        await showDialog("編集可能なパートがありません。", true);
        return;
      }

      const songIds = event.setlist?.flatMap(g => g.songIds) || [];
      let updatedCount = 0;
      const nextMap: Record<string, Record<string, string>> = {};

      Object.keys(currentMap).forEach(sId => {
        nextMap[sId] = { ...(currentMap[sId] || {}) };
      });

      songIds.forEach(songId => {
        if (!nextMap[songId]) nextMap[songId] = {};

        editablePartsList.forEach(p => {
          const validCandidates = p.instrumentId ? (usersByInstrument[p.instrumentId] || []) : [];
          const validCandidateIds = new Set(validCandidates.map(u => u.id));

          // 該当する過去履歴
          const matchRecords = pastRecords.filter(
            r => r.songId === songId && r.partName === p.partName && validCandidateIds.has(r.userId)
          );

          if (matchRecords.length > 0) {
            // 各ユーザーの演奏回数と最新日を集計
            const userStats: Record<string, { count: number; latestDate: string }> = {};
            matchRecords.forEach(r => {
              if (!userStats[r.userId]) {
                userStats[r.userId] = { count: 0, latestDate: r.eventDate };
              }
              userStats[r.userId].count += 1;
              if (r.eventDate > userStats[r.userId].latestDate) {
                userStats[r.userId].latestDate = r.eventDate;
              }
            });

            // 1. 演奏回数降順 -> 2. 最新日付降順
            const bestUser = Object.entries(userStats).sort((a, b) => {
              if (b[1].count !== a[1].count) {
                return b[1].count - a[1].count;
              }
              return b[1].latestDate.localeCompare(a[1].latestDate);
            })[0];

            if (bestUser && bestUser[0]) {
              const currentVal = nextMap[songId][p.partName] || "";
              if (currentVal !== bestUser[0]) {
                nextMap[songId][p.partName] = bestUser[0];
                updatedCount += 1;
              }
            }
          }
        });
      });

      hideSpinner();
      if (updatedCount > 0) {
        setCurrentMap(nextMap);
        await showDialog(
          `過去の譜割りから ${updatedCount} 箇所のパートを自動入力しました。\n（※「更新する」ボタンを押すまで保存されません）`,
          true
        );
      } else {
        await showDialog(
          "過去の実績と一致するパート、または新しい割り当て対象は見つかりませんでした。",
          true
        );
      }
    } catch (err) {
      console.error(err);
      hideSpinner();
      await showDialog("過去の譜割りの読み込みに失敗しました。", true);
    }
  };

  // クリア（編集前の初期状態に戻す）
  const handleClear = async () => {
    if (await showDialog("編集前に戻しますか？")) {
      const map: Record<string, Record<string, string>> = {};
      initialAssigns.forEach(a => {
        if (!map[a.songId]) map[a.songId] = {};
        map[a.songId][a.partName] = a.userId || "";
      });
      setCurrentMap(map);
    }
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
      showSpinner();
      router.refresh();
      router.push(`/assign/confirm?eventId=${event.id}`);
    } catch (e) {
      hideSpinner();
      console.error(e);
      await writeLog({ dataId: event.id, action: "譜割り更新", status: "error", errorDetail: { message: (e as Error).message } });
      await showDialog("更新に失敗しました", true);
    }
  };

  if (Object.keys(editGroups).length === 0) {
    return (
      <BaseLayout>
        <div className="container">
          <p className={styles.emptyMessage}>
            このイベントには、あなたの担当楽器のパートが設定されていません。
          </p>
        </div>
        <FormFooter backHref={`/assign/confirm?eventId=${event.id}`} backText="譜割り確認" />

        <AssignMemberDetailModal
          isOpen={Boolean(selectedMemberModal)}
          onClose={() => setSelectedMemberModal(null)}
          memberName={selectedMemberModal?.name || ""}
          assignedSongs={memberAssignedSongs}
        />
      </BaseLayout>
    );
  }

  return (
    <BaseLayout>
      <div className="page-header">
        <h1><i className="fa-solid fa-people-group" /> 譜割り編集</h1>
      </div>

      <div className="container">
        <div className={styles.topControls}>
          <div className={styles.eventInfo}>
            <span className={styles.eventTitle}>{event.title}</span>
            <span className={styles.eventDate}>{event.date || "日付未定"}</span>
          </div>
        </div>

        {playlistUrl && (
          <div className={styles.referencePlaylistWrapper}>
            <a href={playlistUrl} target="_blank" rel="noreferrer" className={styles.playlistButton}>
              <i className="fa-brands fa-youtube" /> 参考音源プレイリスト
            </a>
          </div>
        )}

        <div className={styles.editActionToolbar}>
          <button
            type="button"
            className={styles.autoAssignButton}
            onClick={handleAutoAssignFromHistory}
          >
            <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: "6px" }} />
            過去の実績から入力
          </button>
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
                              const isSolo = solosSet.has(`${songId}__${p.partName}`);
                              const isFeature = featuresSet.has(`${songId}__${p.partName}`);
                              const cellClass = isFeature ? styles.featureCell : isSolo ? styles.soloCell : "";
                              const selectClass = isFeature ? styles.featureSelect : isSolo ? styles.soloSelect : "";
                              return (
                                <td key={p.partName} className={`${styles.assignCell} ${cellClass}`}>
                                  <div className={styles.cellContent}>
                                    {isFeature && <span className={styles.featureBadge}>Feat</span>}
                                    {isSolo && <span className={styles.soloBadge}>Solo</span>}
                                    <select
                                      className={`${styles.assignSelect} ${selectClass}`}
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
                                  </div>
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

        {/* リアルタイム小計 */}
        <div className={styles.summaryWrapper}>
          {primarySectionId && (
            <div className={styles.summarySectionPrimary}>
              <div className={styles.summarySectionHeader}>
                <h3>
                  <i className="fa-solid fa-calculator" style={{ marginRight: "0.5rem" }} />
                  {masterData.sections[primarySectionId]?.name || "セクション"} 小計
                  {mySectionId === primarySectionId && (
                    <span className={styles.mySectionBadge}>あなたのセクション</span>
                  )}
                </h3>
              </div>
              {renderSectionSummary(primarySectionId)}
            </div>
          )}

          {otherSectionIds.length > 0 && (
            <details className={styles.otherSectionsDetails}>
              <summary className={styles.otherSectionsSummary}>
                <span className={styles.summaryTitleText}>
                  <i className="fa-solid fa-layer-group" style={{ marginRight: "0.5rem" }} />
                  その他の小計
                </span>
                <span className={styles.detailsToggleText}>タップして表示 / 折り畳む</span>
              </summary>
              <div className={styles.otherSectionsContent}>
                {otherSectionIds.map(secId => (
                  <div key={secId} className={styles.summarySectionSecondary}>
                    <h4 className={styles.secondarySectionTitle}>
                      <i className="fa-solid fa-calculator" style={{ marginRight: "0.4rem", fontSize: "13px" }} />
                      {masterData.sections[secId]?.name || secId} 小計
                    </h4>
                    {renderSectionSummary(secId)}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        <div className="confirm-buttons" style={{ marginTop: "30px", display: "flex", gap: "15px" }}>
          <button type="button" className={`clear-button ${styles.clearButton}`} onClick={handleClear}>
            クリア
          </button>
          <button type="button" className={`save-button ${styles.saveButton}`} onClick={handleSave}>
            更新する
          </button>
        </div>

        </div>
        <FormFooter backHref={`/assign/confirm?eventId=${event.id}`} backText="譜割り確認" />
      </BaseLayout>
  );
}
