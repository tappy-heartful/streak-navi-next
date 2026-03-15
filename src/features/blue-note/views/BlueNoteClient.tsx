"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { BlueNote } from "@/src/lib/firestore/types";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useAuth } from "@/src/contexts/AuthContext";
import * as utils from "@/src/lib/functions";
import { showSpinner, hideSpinner, showDialog, writeLog } from "@/src/lib/functions";
import { saveBlueNote, deleteBlueNote, fetchBlueNotes } from "@/src/features/blue-note/api/blue-note-client-service";
import styles from "./blue-note.module.css";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

type Props = {
  initialBlueNotes: BlueNote[];
};

export function BlueNoteClient({ initialBlueNotes }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const { user, isAdmin } = useAuth();
  const [blueNotes, setBlueNotes] = useState<BlueNote[]>(initialBlueNotes);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  // 1. パンくず設定
  useEffect(() => {
    setBreadcrumbs([{ title: "今日の一曲" }]);
  }, [setBreadcrumbs]);

  // 2. ユーザー名のマッピングを取得
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const uids = Array.from(new Set(blueNotes.map(n => n.createdBy).filter((uid): uid is string => !!uid)));
        if (uids.length === 0) return;
        
        // 簡易的に全ユーザー取得（または必要分だけ）
        const snap = await getDocs(collection(db, "users"));
        const map: Record<string, string> = {};
        snap.docs.forEach(d => {
          map[d.id] = d.data().displayName || "不明";
        });
        setUserMap(map);
      } catch (e) {
        console.error("User fetch error:", e);
      }
    };
    fetchUsers();
  }, [blueNotes]);

  // 3. 初期インデックス設定（現在の日付 or ランダム）
  useEffect(() => {
    const todayId = utils.format(new Date(), "MMdd");
    const idx = blueNotes.findIndex(n => n.id === todayId);
    if (idx !== -1) {
      setCurrentIdx(idx);
    } else if (blueNotes.length > 0) {
      setCurrentIdx(Math.floor(Math.random() * blueNotes.length));
    }
  }, [blueNotes]);

  // 現在の月のデータ
  const monthPrefix = String(selectedMonth).padStart(2, "0");
  const monthBlueNotes = useMemo(() => {
    return blueNotes.filter(n => n.id.startsWith(monthPrefix));
  }, [blueNotes, monthPrefix]);

  // 日数計算
  const daysInMonth = useMemo(() => {
    return new Date(2024, selectedMonth, 0).getDate();
  }, [selectedMonth]);

  // 再読み込み
  const reloadData = useCallback(async () => {
    const data = await fetchBlueNotes();
    setBlueNotes(data);
  }, []);

  // 保存処理
  const handleSave = async (dateId: string, title: string, youtubeUrl: string) => {
    if (!title.trim() || !youtubeUrl.trim()) {
      await showDialog("タイトルとURLを入力してください");
      return;
    }

    const videoId = utils.extractYouTubeId(youtubeUrl);
    if (!videoId || videoId.length !== 11) {
      await showDialog("YouTubeのURLを正しく入力してください");
      return;
    }

    // 重複チェック
    const isDuplicate = blueNotes.some(n => n.youtubeId === videoId && n.id !== dateId);
    if (isDuplicate) {
      const dup = blueNotes.find(n => n.youtubeId === videoId);
      const m = parseInt(dup!.id.substring(0, 2));
      const d = parseInt(dup!.id.substring(2));
      await showDialog(`この動画は既に登録されています：${m}月${d}日`);
      return;
    }

    if (!(await showDialog("保存しますか？"))) return;

    showSpinner();
    try {
      await saveBlueNote(dateId, {
        title,
        youtubeId: videoId,
        createdBy: user?.uid || "unknown"
      });
      await writeLog({ dataId: dateId, action: "BlueNote保存" });
      await showDialog("保存しました", true);
      await reloadData();
    } catch (e) {
      console.error(e);
      await writeLog({ dataId: dateId, action: "BlueNote保存", status: "error", errorDetail: { message: (e as Error).message } });
      await showDialog("保存に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  // 削除処理
  const handleDelete = async (dateId: string) => {
    if (!(await showDialog("削除しますか？"))) return;

    showSpinner();
    try {
      await deleteBlueNote(dateId);
      await writeLog({ dataId: dateId, action: "BlueNote削除" });
      await showDialog("削除しました", true);
      await reloadData();
    } catch (e) {
      console.error(e);
      await writeLog({ dataId: dateId, action: "BlueNote削除", status: "error", errorDetail: { message: (e as Error).message } });
      await showDialog("削除に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  // プレイリストURL
  const playlistIds = useMemo(() => {
    return monthBlueNotes.map(n => n.youtubeId).filter(Boolean).join(",");
  }, [monthBlueNotes]);

  return (
    <BaseLayout>
      <div className={styles.container}>
        <div className="page-header">
          <h1><i className="fa fa-headphones" /> 今日の一曲</h1>
        </div>

        {/* プレイヤーセクション */}
        {blueNotes.length > 0 && (
          <div className={styles.playerWrapper}>
            <div className={styles.playerTitle}>
              {blueNotes[currentIdx]?.title || "Now Playing"}
            </div>
            <div dangerouslySetInnerHTML={{ 
              __html: utils.buildYouTubeHtml(utils.getWatchVideosOrder(currentIdx, blueNotes), false) 
            }} />
            <div className={styles.playerControls}>
              <button 
                className={styles.controlButton} 
                onClick={() => setCurrentIdx((currentIdx - 1 + blueNotes.length) % blueNotes.length)}
              >
                <i className="fa-solid fa-backward-step" /> 前へ
              </button>
              <button 
                className={`${styles.controlButton} ${styles.activeButton}`} 
                onClick={() => setCurrentIdx(utils.getRandomIndex(currentIdx, blueNotes.length))}
              >
                ランダム <i className="fa-solid fa-arrows-rotate" />
              </button>
              <button 
                className={styles.controlButton} 
                onClick={() => setCurrentIdx((currentIdx + 1) % blueNotes.length)}
              >
                次へ <i className="fa-solid fa-forward-step" />
              </button>
            </div>
          </div>
        )}

        {/* 月切り替えタブ */}
        <div className={styles.monthTabs}>
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className={`${styles.monthTab} ${selectedMonth === i + 1 ? styles.active : ""}`}
              onClick={() => setSelectedMonth(i + 1)}
            >
              {i + 1}月
            </div>
          ))}
        </div>

        <div className="container">
          <div className={styles.playlistHeader}>
            <h3>{selectedMonth}月のプレイリスト</h3>
            {playlistIds && (
              <a 
                href={`https://www.youtube.com/watch_videos?video_ids=${playlistIds}`} 
                target="_blank" 
                rel="noreferrer" 
                className={styles.playlistButton}
              >
                <i className="fa-brands fa-youtube" /> 月間再生
              </a>
            )}
          </div>

          <div className={styles.songList}>
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const dateId = `${monthPrefix}${String(day).padStart(2, "0")}`;
              const note = blueNotes.find(n => n.id === dateId);
              return (
                <SongItem 
                  key={dateId}
                  day={day}
                  dateId={dateId}
                  note={note}
                  userName={note?.createdBy ? userMap[note.createdBy] : ""}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onPlay={() => {
                    const idx = blueNotes.findIndex(n => n.id === dateId);
                    if (idx !== -1) {
                      setCurrentIdx(idx);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  isAllowedToDelete={isAdmin || (!!user && note?.createdBy === user.uid)}
                />
              );
            })}
          </div>
        </div>

        <div className="page-footer">
          <Link href="/home" className="back-link">← ホームに戻る</Link>
        </div>
      </div>
    </BaseLayout>
  );
}

function SongItem({ 
  day, dateId, note, userName, onSave, onDelete, onPlay, isAllowedToDelete 
}: { 
  day: number; dateId: string; note?: BlueNote; userName?: string;
  onSave: (id: string, t: string, u: string) => void;
  onDelete: (id: string) => void;
  onPlay: () => void;
  isAllowedToDelete: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note?.title || "");
  const [url, setUrl] = useState(note?.youtubeId ? `https://youtu.be/${note.youtubeId}` : "");

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setUrl(`https://youtu.be/${note.youtubeId}`);
    } else {
      setTitle("");
      setUrl("");
    }
  }, [note]);

  return (
    <div className={styles.songItem}>
      <div className={styles.dayLabel}>{day}日</div>
      
      {note && !isEditing ? (
        <>
          <div className={styles.songContent}>
            <a href="#" onClick={(e) => { e.preventDefault(); onPlay(); }} className={styles.songTitle}>
              <i className="fa-brands fa-youtube" style={{ marginRight: "8px", color: "#ff0000" }} />
              {note.title}
            </a>
            <div className={styles.createdBy}>登録: {userName || "---"}</div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className={styles.deleteButton} style={{ borderColor: "#4caf50", color: "#4caf50" }} onClick={() => setIsEditing(true)}>編集</button>
            {isAllowedToDelete && (
              <button className={styles.deleteButton} onClick={() => onDelete(dateId)}>削除</button>
            )}
          </div>
        </>
      ) : (
        <div className={styles.editForm}>
          <input 
            className={styles.inputField} 
            placeholder="曲名" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
          />
          <input 
            className={styles.inputField} 
            placeholder="YouTube URL" 
            value={url} 
            onChange={e => setUrl(e.target.value)} 
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            {note && <button className={styles.deleteButton} style={{ borderColor: "#999", color: "#999" }} onClick={() => setIsEditing(false)}>キャンセル</button>}
            <button className={styles.saveButton} onClick={() => {
              onSave(dateId, title, url);
              if (note) setIsEditing(false);
            }}>保存</button>
          </div>
        </div>
      )}
    </div>
  );
}
