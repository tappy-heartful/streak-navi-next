"use client";

import { useAuth } from "@/src/contexts/AuthContext";
import { FormField } from "@/src/components/Form/FormField";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { GenreInput } from "../../components/GenreInput";
import { saveScore } from "@/src/features/scores/api/score-client-service";
import { rules } from "@/src/lib/validation";
import { Genre, Score } from "@/src/lib/firestore/types";
import { useAppForm } from "@/src/hooks/useAppForm";

type Props = {
  mode: "new" | "edit" | "copy";
  scoreId?: string;
  initialScore: Score | null;
  allGenres: Genre[];
};

export function ScoreEditClient({ mode, scoreId, initialScore, allGenres }: Props) {
  const { user } = useAuth();

  // 1. フォームの状態とバリデーションルールを「定義」するだけ
  const { formData, errors, updateField, validate } = useAppForm(
    {
      title: (mode === "copy" ? `${initialScore?.title}（コピー）` : initialScore?.title) || "",
      scoreUrl: initialScore?.scoreUrl || "",
      referenceTrack: initialScore?.referenceTrack || "",
      genres: (initialScore?.genres as string[]) || [""],
      abbreviation: initialScore?.abbreviation || "",
      note: initialScore?.note || "",
      isDispTop: mode === "new" ? true : (initialScore?.isDispTop ?? false),
    },
    {
      title: [rules.required],
      scoreUrl: [rules.required, rules.googleDrive],
      referenceTrack: [rules.required, rules.youtube],
      abbreviation: [rules.required, rules.max8],
      genres: [(v) => (v[0] ? true : "最低1つ選択してください")],
    }
  );

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="譜面" featureIdKey="scoreId" basePath="/score"
        dataId={scoreId} mode={mode}
        onValidate={validate} // フックのvalidateを渡すだけ
        onSaveApi={() => saveScore(mode, formData, scoreId, user?.displayName || undefined)}
      >
        <FormField label="タイトル" required error={errors.title}>
          <input type="text" className="form-control" value={formData.title} 
            onChange={(e) => updateField("title", e.target.value)} />
        </FormField>

        <FormField label="譜面（Google Drive URL）" required error={errors.scoreUrl}>
          <input type="text" className="form-control" value={formData.scoreUrl} 
            onChange={(e) => updateField("scoreUrl", e.target.value)} />
        </FormField>

        <FormField label="参考音源（YouTube URL）" required error={errors.referenceTrack}>
          <input type="text" className="form-control" value={formData.referenceTrack} 
            onChange={(e) => updateField("referenceTrack", e.target.value)} />
        </FormField>

        <FormField label="ジャンル" required error={errors.genres}>
          <GenreInput genres={formData.genres} allGenres={allGenres} 
            onChange={(val) => updateField("genres", val)} />
        </FormField>

        <FormField label="略称(譜割用)" required error={errors.abbreviation}>
          <input type="text" className="form-control" value={formData.abbreviation} 
            onChange={(e) => updateField("abbreviation", e.target.value)} />
        </FormField>

        <FormField label="備考">
          <input type="text" className="form-control" value={formData.note} 
            onChange={(e) => updateField("note", e.target.value)} />
        </FormField>

        <div className="form-group checkbox-group">
          <label>
            <input type="checkbox" checked={formData.isDispTop} 
              onChange={(e) => updateField("isDispTop", e.target.checked)} />
            ホームに表示
          </label>
        </div>
      </EditFormLayout>
    </BaseLayout>
  );
}