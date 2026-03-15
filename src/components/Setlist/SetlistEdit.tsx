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
    <div className="setlist-edit-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {setlist.map((group, groupIdx) => (
        <div
          key={groupIdx}
          className="vote-item"
          style={{ background: "rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "8px" }}
        >
          <input
            type="text"
            value={group.title}
            onChange={(e) => updateSetlistGroupTitle(groupIdx, e.target.value)}
            placeholder="グループ名（例: 前半, 後半, アンコール）"
            style={{
              marginBottom: "0.5rem",
              width: "100%",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "inherit",
              padding: "0.5rem",
              borderRadius: "4px",
            }}
          />
          <div
            className="vote-choices"
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }}
          >
            {group.songIds.map((songId, songIdx) => (
              <div key={songIdx} className="choice-wrapper" style={{ display: "flex", gap: "0.5rem" }}>
                <select
                  value={songId}
                  onChange={(e) => updateSongInGroup(groupIdx, songIdx, e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    color: "inherit",
                    border: "1px solid rgba(255,255,255,0.2)",
                    padding: "0.5rem",
                    borderRadius: "4px",
                  }}
                >
                  <option value="" style={{ color: "#333" }}>-- 曲を選択 --</option>
                  {scores.map((s) => (
                    <option key={s.id} value={s.id} style={{ color: "#333" }}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="remove-choice"
                  onClick={() => removeSongFromGroup(groupIdx, songIdx)}
                  style={{
                    padding: "0.5rem",
                    background: "rgba(255,0,0,0.2)",
                    border: "none",
                    color: "#ff4444",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              className="add-choice"
              onClick={() => addSongToGroup(groupIdx)}
              style={{
                flex: 1,
                padding: "0.5rem",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "inherit",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ＋ 曲を追加
            </button>
            {setlist.length > 1 && (
              <button
                type="button"
                className="remove-item"
                onClick={() => removeSetlistGroup(groupIdx)}
                style={{
                  padding: "0.5rem",
                  background: "rgba(255,0,0,0.2)",
                  border: "none",
                  color: "#ff4444",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                グループ削除
              </button>
            )}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="add-item-button"
        onClick={addSetlistGroup}
        style={{
          padding: "0.75rem",
          background: "rgba(255,255,255,0.1)",
          border: "1px dashed rgba(255,255,255,0.3)",
          color: "inherit",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        ＋ グループを追加
      </button>
    </div>
  );
}
