"use client";

import React, { useState } from "react";
import { Score, SetlistGroup } from "@/src/lib/firestore/types";
import { extractYouTubeId } from "@/src/lib/functions";
import { ScoreFileListModal } from "@/src/features/scores/components/ScoreFileListModal";

type Props = {
  setlist: SetlistGroup[];
  scoresMap: Record<string, Score>;
};

export function SetlistConfirm({ setlist, scoresMap }: Props) {
  const [selectedScore, setSelectedScore] = useState<Score | null>(null);
  const watchIds: string[] = [];
  const setlistGroups = setlist.map((group) => {
    const songs = (group.songIds || []).map((id) => {
      const score = scoresMap[id];
      if (!score) return { id, score: null, title: "曲名が見つかりません" };
      if (score.referenceTrack) {
        const vid = extractYouTubeId(score.referenceTrack);
        if (vid && !watchIds.includes(vid)) watchIds.push(vid);
      }
      return { id, score, title: score.title };
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
                  {song.score ? (
                    <button
                      type="button"
                      onClick={() => setSelectedScore(song.score)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        color: "#4daafc",
                        fontSize: "15px",
                        cursor: "pointer",
                        textAlign: "left",
                        textDecoration: "underline",
                        textUnderlineOffset: "2px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      title={`${song.title}の譜面一覧を表示`}
                    >
                      <i className="fa-solid fa-music" style={{ fontSize: "12px", opacity: 0.8 }} />
                      <span>{song.title}</span>
                    </button>
                  ) : (
                    <span>{song.title}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ScoreFileListModal
        isOpen={Boolean(selectedScore)}
        onClose={() => setSelectedScore(null)}
        title={selectedScore?.title || ""}
        scoreId={selectedScore?.id}
        files={selectedScore?.files}
        legacyScoreUrl={selectedScore?.scoreUrl}
      />
    </div>
  );
}
