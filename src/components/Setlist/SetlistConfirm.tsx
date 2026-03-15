"use client";

import React from "react";
import { Score, SetlistGroup } from "@/src/lib/firestore/types";
import { extractYouTubeId } from "@/src/lib/functions";

type Props = {
  setlist: SetlistGroup[];
  scoresMap: Record<string, Score>;
};

export function SetlistConfirm({ setlist, scoresMap }: Props) {
  const watchIds: string[] = [];
  const setlistGroups = setlist.map((group) => {
    const songs = (group.songIds || []).map((id) => {
      const score = scoresMap[id];
      if (!score) return { id, title: "曲名が見つかりません", scoreUrl: undefined };
      if (score.referenceTrack) {
        const vid = extractYouTubeId(score.referenceTrack);
        if (vid && !watchIds.includes(vid)) watchIds.push(vid);
      }
      return { id, title: score.title, scoreUrl: score.scoreUrl };
    });
    return { title: group.title, songs };
  });

  const playlistUrl =
    watchIds.length > 0
      ? `https://www.youtube.com/watch_videos?video_ids=${watchIds.join(",")}`
      : null;

  if (setlistGroups.length === 0) {
    return <div className="label-value" style={{ opacity: 0.5 }}>設定されていません</div>;
  }

  return (
    <div className="setlist-confirm-wrapper">
      <div
        className="score-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}
      >
        <label className="label-title" style={{ margin: 0 }}>🎵 セットリスト</label>
        {playlistUrl && (
          <a
            href={playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="playlist-button"
            style={{
              fontSize: "12px",
              background: "#ff0000",
              color: "white",
              padding: "4px 10px",
              borderRadius: "15px",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            <i className="fab fa-youtube" /> 参考音源
          </a>
        )}
      </div>
      <div
        className="label-value"
        style={{
          padding: "12px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {setlistGroups.map((group, i) => (
          <div
            key={i}
            className="setlist-group-confirm"
            style={{ marginBottom: i === setlistGroups.length - 1 ? 0 : "16px" }}
          >
            {group.title && (
              <h4
                style={{
                  fontSize: "14px",
                  color: "var(--color-active)",
                  marginBottom: "8px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  paddingBottom: "4px",
                }}
              >
                {group.title}
              </h4>
            )}
            <div className="setlist-songs" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {group.songs.map((song, j) => (
                <div
                  key={j}
                  style={{ fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ opacity: 0.5, fontSize: "12px" }}>{j + 1}.</span>
                  {song.scoreUrl ? (
                    <a
                      href={song.scoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#4daafc", textDecoration: "none" }}
                    >
                      {song.title}
                    </a>
                  ) : (
                    <span>{song.title}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
