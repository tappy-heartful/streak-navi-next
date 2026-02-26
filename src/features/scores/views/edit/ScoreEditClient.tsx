"use client";

import { useAuth } from "@/src/contexts/AuthContext";
import { FormField } from "@/src/components/Form/FormField";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { GenreInput } from "../../components/GenreInput";
import { AppInput } from "@/src/components/Form/AppInput";
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

  const { formData, errors, updateField, validate, resetForm } = useAppForm(
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

  const inputProps = (field: keyof typeof formData) => ({
    field,
    value: formData[field],
    error: errors[field],
    updateField,
  });

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="譜面" featureIdKey="scoreId" basePath="/score"
        dataId={scoreId} mode={mode}
        onValidate={validate}
        onSaveApi={() => saveScore(mode, formData, scoreId, user?.displayName || undefined)}
        onClear={resetForm} // ★ 追加：リセット関数を渡す
      >
        <AppInput label="タイトル" required {...inputProps("title")} />
        <AppInput label="譜面（Google Drive URL）" required {...inputProps("scoreUrl")} />
        <AppInput label="参考音源（YouTube URL）" required {...inputProps("referenceTrack")} />

        <FormField label="ジャンル" required error={errors.genres}>
          <GenreInput genres={formData.genres} allGenres={allGenres} 
            onChange={(val) => updateField("genres", val)} />
        </FormField>

        <AppInput label="略称(譜割用)" required {...inputProps("abbreviation")} />
        <AppInput label="備考" {...inputProps("note")} />
        <AppInput label="ホームに表示" type="checkbox" {...inputProps("isDispTop")} />
      </EditFormLayout>
    </BaseLayout>
  );
}