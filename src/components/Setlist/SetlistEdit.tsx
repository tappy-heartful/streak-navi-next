"use client";

import React from "react";
import { Score, SetlistGroup } from "@/src/lib/firestore/types";

type Props = {
  setlist: SetlistGroup[];
  scores: Score[];
  onChange: (setlist: SetlistGroup[]) => void;
};

export function SetlistEdit({ setlist, scores, onChange }: Props) {
  const addSetlistGroup = () => {
    onChange([...setlist, { title: "", songIds: [] }]);
  };

  const removeSetlistGroup = (idx: number) => {
    onChange(setlist.filter((_, i) => i !== idx));
  };

  const updateSetlistGroupTitle = (idx: number, title: string) => {
    onChange(setlist.map((g, i) => (i === idx ? { ...g, title } : g)));
  };

  const addSongToGroup = (groupIdx: number) => {
    onChange(
      setlist.map((g, i) =>
        i === groupIdx ? { ...g, songIds: [...g.songIds, ""] } : g
      )
    );
  };

  const removeSongFromGroup = (groupIdx: number, songIdx: number) => {
    onChange(
      setlist.map((g, i) =>
        i === groupIdx ? { ...g, songIds: g.songIds.filter((_, j) => j !== songIdx) } : g
      )
    );
  };

  const updateSongInGroup = (groupIdx: number, songIdx: number, scoreId: string) => {
    onChange(
      setlist.map((g, i) =>
        i === groupIdx
          ? { ...g, songIds: g.songIds.map((s, j) => (j === songIdx ? scoreId : s)) }
          : g
      )
    );
  };

  return (
    <div className="setlist-edit-container" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {setlist.map((group, groupIdx) => (
        <div key={groupIdx} className="vote-item" style={{ position: "relative", padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
            <i className="fa-solid fa-layer-group" style={{ color: "#4CAF50" }}></i>
            <input
              type="text"
              value={group.title}
              onChange={(e) => updateSetlistGroupTitle(groupIdx, e.target.value)}
              placeholder="グループ名（例: 前半, 後半, アンコール）"
              style={{
                flex: 1,
                fontWeight: "bold",
                fontSize: "1rem",
                border: "none",
                borderBottom: "2px solid #eee",
                borderRadius: "0",
                padding: "4px 0",
              }}
            />
            {setlist.length > 1 && (
              <button
                type="button"
                className="remove-choice"
                onClick={() => removeSetlistGroup(groupIdx)}
                title="グループ削除"
                style={{ background: "#ffebf0", color: "#e53e3e", border: "1px solid #fed7e2" }}
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
            )}
          </div>

          <div className="vote-choices">
            {group.songIds.map((songId, songIdx) => (
              <div key={songIdx} className="choice-wrapper">
                <span style={{ fontSize: "14px", color: "#888", minWidth: "20px" }}>{songIdx + 1}.</span>
                <i className="fa-solid fa-music" style={{ color: "#aaa", fontSize: "14px" }}></i>
                <select
                  value={songId}
                  onChange={(e) => updateSongInGroup(groupIdx, songIdx, e.target.value)}
                >
                  <option value="">-- 曲を選択 --</option>
                  {scores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="remove-choice"
                  onClick={() => removeSongFromGroup(groupIdx, songIdx)}
                  title="曲を削除"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="add-choice"
              onClick={() => addSongToGroup(groupIdx)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "#f0fdf4", color: "#166534", border: "1px dashed #bbf7d0" }}
            >
              <i className="fa-solid fa-plus"></i> 曲を追加
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="add-item-button"
        onClick={addSetlistGroup}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "1rem",
          background: "#fff",
          border: "2px dashed #4CAF50",
          color: "#4CAF50",
          fontWeight: "bold",
          borderRadius: "12px",
          transition: "all 0.2s"
        }}
      >
        <i className="fa-solid fa-plus-circle"></i> グループを追加
      </button>
    </div>
  );
}
