"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Event, Assign, Score, User, Section, Instrument, AssignComment } from "@/src/lib/firestore/types";
import { saveAssignComment, deleteAssignComment } from "@/src/features/assign/api/assign-client-service";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useAuth } from "@/src/contexts/AuthContext";
import styles from "./assign.module.css";
import Link from "next/link";
import * as utils from "@/src/lib/functions";
import { ScoreFileListModal } from "@/src/features/scores/components/ScoreFileListModal";
import { AssignMemberDetailModal, MemberSongAssign } from "@/src/features/assign/components/AssignMemberDetailModal";

type Props = {
  event: Event;
  assigns: Assign[];
  masterData: {
    scores: Record<string, Score>;
    users: Record<string, User>;
    sections: Record<string, Section>;
    instruments?: Record<string, Instrument>;
  };
  initialComments?: AssignComment[];
};

export function AssignConfirmClient({ event, assigns, masterData, initialComments }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("");
  const [selectedScoreForModal, setSelectedScoreForModal] = useState<Score | null>(null);

  // コメント機能用ステート
  const [comments, setComments] = useState<AssignComment[]>(initialComments || []);
  const [commentType, setCommentType] = useState<"all" | "section">("all");
  const [commentText, setCommentText] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "type_all" | "my_section">("all");
  const [selectedMemberModal, setSelectedMemberModal] = useState<{ name: string; userId?: string } | null>(null);

  const mySectionId = user?.uid ? (masterData.users[user.uid]?.sectionId || userData?.sectionId) : undefined;
  const mySectionName = mySectionId ? (masterData.sections[mySectionId]?.name || "") : "";

  // 自分の投稿済みコメント
  const myAllComment = useMemo(() => {
    return comments.find(c => c.uid === user?.uid && c.type === "all");
  }, [comments, user?.uid]);

  const mySectionComment = useMemo(() => {
    return comments.find(c => c.uid === user?.uid && c.type === "section");
  }, [comments, user?.uid]);

  // タイプ切り替え時のコメント初期入力同期
  useEffect(() => {
    if (commentType === "all") {
      setCommentText(myAllComment?.comment || "");
    } else {
      setCommentText(mySectionComment?.comment || "");
    }
  }, [commentType, myAllComment, mySectionComment]);

  // コメント保存
  const handleSaveComment = async () => {
    if (!user?.uid) {
      await utils.showDialog("ログインが必要です", true);
      return;
    }
    if (!commentText.trim()) {
      await utils.showDialog("コメントを入力してください", true);
      return;
    }

    const targetLabel = commentType === "all" ? "全体向け" : `パート向け (${mySectionName || "自パート"})`;
    const isEditing = commentType === "all" ? Boolean(myAllComment) : Boolean(mySectionComment);
    const confirmed = await utils.showDialog(`${targetLabel}のコメントを${isEditing ? "更新" : "投稿"}しますか？`);
    if (!confirmed) return;

    utils.showSpinner();
    try {
      await saveAssignComment(
        event.id,
        user.uid,
        commentType,
        commentText.trim(),
        commentType === "section" ? mySectionId : undefined
      );

      setComments(prev => {
        const filtered = prev.filter(c => !(c.uid === user.uid && c.type === commentType));
        const newC: AssignComment = {
          id: `${event.id}_${user.uid}_${commentType}`,
          eventId: event.id,
          uid: user.uid,
          type: commentType,
          sectionId: commentType === "section" ? mySectionId : undefined,
          comment: commentText.trim(),
          updatedAt: Date.now(),
          createdAt: Date.now(),
        };
        return [newC, ...filtered];
      });

      utils.hideSpinner();
      await utils.showDialog("コメントを保存しました", true);
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
      utils.hideSpinner();
      await utils.showDialog("コメントの保存に失敗しました", true);
    }
  };

  // コメント削除
  const handleDeleteComment = async (type: "all" | "section") => {
    if (!user?.uid) return;
    const confirmed = await utils.showDialog("コメントを削除しますか？");
    if (!confirmed) return;

    utils.showSpinner();
    try {
      await deleteAssignComment(event.id, user.uid, type);
      setComments(prev => prev.filter(c => !(c.uid === user.uid && c.type === type)));
      if (commentType === type) {
        setCommentText("");
      }
      utils.hideSpinner();
      await utils.showDialog("コメントを削除しました", true);
    } catch (err) {
      console.error(err);
      utils.hideSpinner();
      await utils.showDialog("コメントの削除に失敗しました", true);
    }
  };

  // フィルタリングされたコメント一覧
  const filteredComments = useMemo(() => {
    if (filterTab === "type_all") {
      return comments.filter(c => c.type === "all");
    }
    if (filterTab === "my_section" && mySectionId) {
      return comments.filter(c => c.type === "section" && c.sectionId === mySectionId);
    }
    return comments;
  }, [comments, filterTab, mySectionId]);

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

  // ソロ判定用のSet (songId__partName)
  const solosSet = useMemo(() => {
    return new Set((event.solos || []).map(s => `${s.songId}__${s.partName}`));
  }, [event.solos]);

  // フィーチャー判定用のSet (songId__partName)
  const featuresSet = useMemo(() => {
    return new Set((event.features || []).map(f => `${f.songId}__${f.partName}`));
  }, [event.features]);

  // 選択中メンバーの担当曲リスト
  const memberAssignedSongs = useMemo(() => {
    if (!selectedMemberModal) return [];

    const result: MemberSongAssign[] = [];
    const targetName = selectedMemberModal.name;
    const targetUid = selectedMemberModal.userId;

    event.setlist?.forEach(group => {
      group.songIds?.forEach(songId => {
        const score = masterData.scores[songId];
        const matchingAssigns = assigns.filter(a => {
          if (a.songId !== songId) return false;
          if (targetUid && a.userId === targetUid) return true;
          return a.assignValue === targetName;
        });

        matchingAssigns.forEach(a => {
          result.push({
            songId,
            songTitle: score?.title || "曲名不明",
            songAbbreviation: score?.abbreviation,
            groupTitle: group.title,
            partName: a.partName,
            isSolo: solosSet.has(`${songId}__${a.partName}`),
            isFeature: featuresSet.has(`${songId}__${a.partName}`),
            score,
          });
        });
      });
    });

    return result;
  }, [selectedMemberModal, event.setlist, assigns, masterData.scores, solosSet, featuresSet]);

  // 譜割り集計用（セクションごと、楽器順にグループ化＆ソロ曲数集計）
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
    const usersList = Object.values(masterData.users || {});

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

      assigns.forEach(a => {
        if (songIds.has(a.songId) && partNames.has(a.partName)) {
          const name = a.assignValue?.trim();
          if (name && name !== "ー") {
            if (!memberMap[name]) {
              const userObj = a.userId
                ? masterData.users[a.userId]
                : usersList.find(u => u.abbreviation === name || u.displayName === name);

              memberMap[name] = {
                name,
                userId: a.userId || userObj?.id,
                count: 0,
                soloCount: 0,
                featureCount: 0,
                matchedUser: userObj,
                playedPartNames: new Set(),
              };
            }

            memberMap[name].count += 1;
            memberMap[name].playedPartNames.add(a.partName);

            if (solosSet.has(`${a.songId}__${a.partName}`)) {
              memberMap[name].soloCount += 1;
            }
            if (featuresSet.has(`${a.songId}__${a.partName}`)) {
              memberMap[name].featureCount += 1;
            }
          }
        }
      });

      // 各メンバーの楽器を特定して MemberSummary を生成
      const members: MemberSummary[] = Object.values(memberMap).map(m => {
        let instId = "";
        // 1. ユーザーの所属楽器の中から当セクションの楽器を優先
        if (m.matchedUser?.instrumentIds && m.matchedUser.instrumentIds.length > 0) {
          const matchSecInst = m.matchedUser.instrumentIds.find(id => instrumentsMap[id]?.sectionId === sectionId);
          if (matchSecInst) {
            instId = matchSecInst;
          } else if (m.matchedUser.instrumentIds[0]) {
            instId = m.matchedUser.instrumentIds[0];
          }
        }

        // 2. ユーザー情報から特定できない場合、実際に割り当てられたパートの楽器から判定
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

        // 楽器の表示順位（パート設定出現順 -> instrumentsのid数値 -> その他）
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

      // グループ内メンバーソート（名前順）
      const groups = Object.values(groupsMap).map(g => {
        g.members.sort((a, b) => a.name.localeCompare(b.name, "ja"));
        return g;
      });

      // グループ自体を楽器順ソート
      groups.sort((a, b) => {
        if (a.instrumentOrder !== b.instrumentOrder) {
          return a.instrumentOrder - b.instrumentOrder;
        }
        return a.instrumentName.localeCompare(b.instrumentName, "ja");
      });

      result[sectionId] = groups;
    });

    return result;
  }, [event.instrumentConfig, event.setlist, assigns, masterData.instruments, masterData.users, solosSet, featuresSet]);

  // セクション表示順序
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
          <h1><i className="fa-solid fa-people-group" /> 譜割り確認</h1>
        </div>

        <div className={styles.topControls}>
          <div className={styles.eventInfo}>
            <Link href={`/event/confirm?eventId=${event.id}`} target="_blank" className={styles.eventTitle}>
              {event.title}
            </Link>
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
                            <button
                              type="button"
                              className={styles.songLinkButton}
                              onClick={() => setSelectedScoreForModal(score)}
                              title={`${score.title}の譜面一覧を表示`}
                            >
                              <span>{score.abbreviation || score.title}</span>
                            </button>
                          </td>
                          {event.instrumentConfig![activeTab]?.map(p => {
                            const a = assigns.find(a => a.songId === songId && a.partName === p.partName);
                            const isSolo = solosSet.has(`${songId}__${p.partName}`);
                            const isFeature = featuresSet.has(`${songId}__${p.partName}`);
                            const cellClass = isFeature ? styles.featureCell : isSolo ? styles.soloCell : "";
                            return (
                              <td key={p.partName} className={`${styles.assignCell} ${cellClass}`}>
                                <div className={styles.cellContent}>
                                  {isFeature && <span className={styles.featureBadge}>Feat</span>}
                                  {isSolo && <span className={styles.soloBadge}>Solo</span>}
                                  <span>{a?.assignValue || "ー"}</span>
                                </div>
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

        {/* 譜割りコメントセクション */}
        <div className={styles.commentsSectionWrapper}>
          <div className={styles.commentsSectionHeader}>
            <h3>
              <i className="fa-solid fa-comments" style={{ marginRight: "0.5rem" }} />
              譜割りコメント
              <span className={styles.commentCountBadge}>{comments.length}</span>
            </h3>
            <button
              type="button"
              className={styles.openFormBtn}
              onClick={() => setIsFormOpen(prev => !prev)}
            >
              <i className={`fa-solid ${isFormOpen ? "fa-xmark" : "fa-pen"}`} style={{ marginRight: "4px" }} />
              {isFormOpen ? "閉じる" : "コメントを書く"}
            </button>
          </div>

          {/* コメント投稿・編集フォーム */}
          {isFormOpen && (
            <div className={styles.commentFormBox}>
              <div className={styles.formTypeSelector}>
                <label className={styles.typeOption}>
                  <input
                    type="radio"
                    name="commentType"
                    value="all"
                    checked={commentType === "all"}
                    onChange={() => setCommentType("all")}
                  />
                  <span>🌐 全体向け</span>
                </label>
                <label className={styles.typeOption}>
                  <input
                    type="radio"
                    name="commentType"
                    value="section"
                    checked={commentType === "section"}
                    onChange={() => setCommentType("section")}
                  />
                  <span>
                    <i className="fa-solid fa-users" style={{ marginRight: "4px" }} />
                    パート向け {mySectionName ? `(${mySectionName})` : ""}
                  </span>
                </label>
              </div>

              <textarea
                className={styles.commentTextarea}
                rows={3}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={commentType === "all" ? "全体向けコメントを入力..." : `${mySectionName || "パート"}向けコメントを入力...`}
              />

              <div className={styles.formActionButtons}>
                <button
                  type="button"
                  className={styles.submitCommentBtn}
                  onClick={handleSaveComment}
                >
                  <i className="fa-solid fa-paper-plane" style={{ marginRight: "4px" }} />
                  {(commentType === "all" ? myAllComment : mySectionComment) ? "更新する" : "投稿する"}
                </button>
                {(commentType === "all" ? myAllComment : mySectionComment) && (
                  <button
                    type="button"
                    className={styles.deleteCommentBtn}
                    onClick={() => handleDeleteComment(commentType)}
                  >
                    <i className="fa-solid fa-trash-can" style={{ marginRight: "4px" }} />
                    削除
                  </button>
                )}
              </div>
            </div>
          )}

          {/* フィルター切り替えタブ */}
          <div className={styles.commentFilterTabs}>
            <button
              type="button"
              className={`${styles.filterTab} ${filterTab === "all" ? styles.filterTabActive : ""}`}
              onClick={() => setFilterTab("all")}
            >
              すべて ({comments.length})
            </button>
            <button
              type="button"
              className={`${styles.filterTab} ${filterTab === "type_all" ? styles.filterTabActive : ""}`}
              onClick={() => setFilterTab("type_all")}
            >
              🌐 全体向け ({comments.filter(c => c.type === "all").length})
            </button>
            {mySectionId && (
              <button
                type="button"
                className={`${styles.filterTab} ${filterTab === "my_section" ? styles.filterTabActive : ""}`}
                onClick={() => setFilterTab("my_section")}
              >
                自パート ({comments.filter(c => c.type === "section" && c.sectionId === mySectionId).length})
              </button>
            )}
          </div>

          {/* コメント一覧ブロック */}
          <div className={styles.commentsListBlock}>
            {filteredComments.length === 0 ? (
              <div className={styles.emptyComments}>コメントはまだありません。</div>
            ) : (
              filteredComments.map(c => {
                const author = masterData.users[c.uid];
                const authorName = author?.displayName || author?.abbreviation || "メンバー";
                const authorPic = author?.pictureUrl || utils.globalLineDefaultImage;
                const isMine = c.uid === user?.uid;
                const secName = c.sectionId ? (masterData.sections[c.sectionId]?.name || "") : "";

                return (
                  <div key={c.id || `${c.eventId}_${c.uid}_${c.type}`} className={styles.commentItem}>
                    <img
                      src={authorPic}
                      alt={authorName}
                      className={styles.commentAvatar}
                      onError={e => { e.currentTarget.src = utils.globalLineDefaultImage; }}
                    />
                    <div className={styles.commentContentArea}>
                      <div className={styles.commentHeader}>
                        <div className={styles.commentAuthorInfo}>
                          <span className={styles.commentAuthorName}>{authorName}</span>
                          {c.type === "all" ? (
                            <span className={styles.commentBadgeAll}>
                              <i className="fa-solid fa-earth-americas" /> 全体向け
                            </span>
                          ) : (
                            <span className={styles.commentBadgeSection}>
                              <i className="fa-solid fa-tag" /> {secName || "パート"}向け
                            </span>
                          )}
                        </div>
                        {c.updatedAt && (
                          <span className={styles.commentDate}>
                            {utils.format(new Date(c.updatedAt), "yyyy/MM/dd HH:mm")}
                          </span>
                        )}
                      </div>
                      <div className={styles.commentText}>{c.comment}</div>
                      {isMine && (
                        <div className={styles.commentMineActions}>
                          <button
                            type="button"
                            className={styles.commentActionLink}
                            onClick={() => {
                              setCommentType(c.type);
                              setCommentText(c.comment);
                              setIsFormOpen(true);
                            }}
                          >
                            <i className="fa-solid fa-pen" style={{ marginRight: "3px" }} />
                            編集
                          </button>
                          <span style={{ color: "#cbd5e1", margin: "0 6px" }}>|</span>
                          <button
                            type="button"
                            className={`${styles.commentActionLink} ${styles.commentDeleteLink}`}
                            onClick={() => handleDeleteComment(c.type)}
                          >
                            <i className="fa-solid fa-trash-can" style={{ marginRight: "3px" }} />
                            削除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.editButtonContainer}>
          <Link
            href={`/assign/edit?eventId=${event.id}`}
            className={styles.editButton}
            onClick={() => {
              utils.showSpinner();
            }}
          >
            <i className="fa-solid fa-pen-to-square" style={{ marginRight: "8px" }} />
            編集画面へ
          </Link>
        </div>
      </div>

      <div className="page-footer">
        <Link href="/assign" className="back-link">← 譜割り一覧に戻る</Link>
      </div>

      <ScoreFileListModal
        isOpen={Boolean(selectedScoreForModal)}
        onClose={() => setSelectedScoreForModal(null)}
        title={selectedScoreForModal?.title || ""}
        scoreId={selectedScoreForModal?.id}
        files={selectedScoreForModal?.files}
        legacyScoreUrl={selectedScoreForModal?.scoreUrl}
      />

      <AssignMemberDetailModal
        isOpen={Boolean(selectedMemberModal)}
        onClose={() => setSelectedMemberModal(null)}
        memberName={selectedMemberModal?.name || ""}
        assignedSongs={memberAssignedSongs}
      />
    </BaseLayout>
  );
}
