"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { AnswerEditLayout } from "@/src/components/Layout/AnswerEditLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Call, ScoreStatus } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import { getMyCallAnswer, saveCallAnswer } from "@/src/features/call/api/call-client-service";

type SongInput = {
  title: string;
  url: string;
  scorestatus: string;
  purchase: string;
  note: string;
};

type AnswersState = Record<string, SongInput[]>;

const emptySong = (): SongInput => ({ title: "", url: "", scorestatus: "", purchase: "", note: "" });

type Props = {
  callData: Call;
  callId: string;
  scoreStatuses: ScoreStatus[];
};

export function CallAnswerClient({ callData, callId, scoreStatuses }: Props) {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.id;

  const [mode, setMode] = useState<"new" | "edit">("new");
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<AnswersState>(() =>
    Object.fromEntries((callData.items || []).map(genre => [genre, [emptySong()]]))
  );

  // 既存回答の読み込み
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const existing = await getMyCallAnswer(callId, uid);
        if (existing) {
          setMode("edit");
          const loaded: AnswersState = {};
          for (const genre of callData.items || []) {
            const songs = existing.answers[genre];
            loaded[genre] = songs && songs.length > 0
              ? songs.map(s => ({
                  title: s.title || "",
                  url: s.url || "",
                  scorestatus: s.scorestatus || "",
                  purchase: s.purchase || "",
                  note: s.note || "",
                }))
              : [emptySong()];
          }
          setAnswers(loaded);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [uid, callId, callData.items]);

  const updateSong = (genre: string, idx: number, field: keyof SongInput, value: string) => {
    setAnswers(prev => {
      const songs = [...prev[genre]];
      songs[idx] = { ...songs[idx], [field]: value };
      return { ...prev, [genre]: songs };
    });
  };

  const addSong = (genre: string) => {
    setAnswers(prev => ({ ...prev, [genre]: [...prev[genre], emptySong()] }));
  };

  const removeSong = (genre: string, idx: number) => {
    setAnswers(prev => {
      const songs = prev[genre].filter((_, i) => i !== idx);
      return { ...prev, [genre]: songs.length > 0 ? songs : [emptySong()] };
    });
  };

  const handleSave = async () => {
    if (!uid) return;

    // バリデーション
    let hasAnyInput = false;
    let hasError = false;
    const errors: string[] = [];

    for (const genre of callData.items || []) {
      for (const song of answers[genre]) {
        const hasInput = song.title || song.url || song.purchase || song.note || song.scorestatus;
        if (!hasInput) continue;
        hasAnyInput = true;

        if (!song.title) { hasError = true; errors.push(`【${genre}】曲名は必須です`); }
        if (!song.url) { hasError = true; errors.push(`【${genre}】参考音源URLは必須です`); }
        if (!song.scorestatus) { hasError = true; errors.push(`【${genre}】譜面状況を選択してください`); }
      }
    }

    if (!hasAnyInput) {
      await showDialog("少なくとも1曲は入力してください。\n（回答を取り消す場合は前の画面でお願いします）", true);
      return;
    }

    if (hasError) {
      await showDialog(errors.join("\n"), true);
      return;
    }

    const confirmed = await showDialog(`回答を${mode === "edit" ? "修正" : "登録"}しますか？`);
    if (!confirmed) return;

    // 空行を除外して保存
    const filteredAnswers: Record<string, typeof answers[string]> = {};
    for (const genre of callData.items || []) {
      filteredAnswers[genre] = answers[genre].filter(
        s => s.title || s.url || s.purchase || s.note || s.scorestatus
      );
    }

    showSpinner();
    try {
      await saveCallAnswer(callId, uid, filteredAnswers);
      hideSpinner();
      await showDialog(`回答を${mode === "edit" ? "修正" : "登録"}しました`, true);
      router.push(`/call/confirm?callId=${callId}`);
    } catch {
      hideSpinner();
      await showDialog("保存に失敗しました", true);
    }
  };

  return (
    <BaseLayout>
      <AnswerEditLayout
        featureName="曲募集"
        basePath="/call"
        featureIdKey="callId"
        dataId={callId}
        mode={mode}
        onSave={handleSave}
        isLoading={isLoading}
      >
        <DisplayField label="募集名">{callData.title}</DisplayField>
        <DisplayField label="募集説明" preWrap>{callData.description}</DisplayField>

        <div className="form-group" style={{ marginTop: "1.5rem" }}>
          <label>募集ジャンル</label>
          <div id="call-items-container">
            {(callData.items || []).map(genre => (
              <div key={genre} className="genre-card" style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #ddd", borderRadius: "6px" }}>
                <div className="genre-title" style={{ fontWeight: "bold", marginBottom: "0.75rem" }}>
                  🎵 {genre}
                </div>
                <div className="songs-container">
                  {(answers[genre] || []).map((song, idx) => (
                    <div key={idx} className="song-item" style={{ marginBottom: "0.75rem", padding: "0.75rem", background: "#f9f9f9", borderRadius: "4px" }}>
                      <input
                        type="text"
                        placeholder="曲名(必須)"
                        value={song.title}
                        onChange={e => updateSong(genre, idx, "title", e.target.value)}
                        style={{ display: "block", width: "100%", marginBottom: "0.4rem", padding: "0.4rem", boxSizing: "border-box" }}
                      />
                      <input
                        type="text"
                        placeholder="参考音源URL(必須)"
                        value={song.url}
                        onChange={e => updateSong(genre, idx, "url", e.target.value)}
                        style={{ display: "block", width: "100%", marginBottom: "0.4rem", padding: "0.4rem", boxSizing: "border-box" }}
                      />
                      <select
                        value={song.scorestatus}
                        onChange={e => updateSong(genre, idx, "scorestatus", e.target.value)}
                        style={{ display: "block", width: "100%", marginBottom: "0.4rem", padding: "0.4rem", boxSizing: "border-box" }}
                      >
                        <option value="">譜面状況(必須)</option>
                        {scoreStatuses.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="購入先リンク(任意)"
                        value={song.purchase}
                        onChange={e => updateSong(genre, idx, "purchase", e.target.value)}
                        style={{ display: "block", width: "100%", marginBottom: "0.4rem", padding: "0.4rem", boxSizing: "border-box" }}
                      />
                      <input
                        type="text"
                        placeholder="備考(任意)"
                        value={song.note}
                        onChange={e => updateSong(genre, idx, "note", e.target.value)}
                        style={{ display: "block", width: "100%", marginBottom: "0.4rem", padding: "0.4rem", boxSizing: "border-box" }}
                      />
                      {(answers[genre] || []).length > 1 && (
                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => removeSong(genre, idx)}
                          style={{ marginTop: "0.25rem" }}
                        >
                          この曲を削除
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="add-button"
                  onClick={() => addSong(genre)}
                  style={{ marginTop: "0.5rem" }}
                >
                  + 曲を追加
                </button>
              </div>
            ))}
          </div>
        </div>
      </AnswerEditLayout>
    </BaseLayout>
  );
}
