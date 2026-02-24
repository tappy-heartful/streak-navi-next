"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog } from "@/src/components/CommonDialog";
import { FormField } from "@/src/components/Form/FormField";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { GenreInput } from "../../components/GenreInput";
import { useEditPageBreadcrumbs } from "@/src/hooks/useEditPageBreadcrumbs";
import { saveScore } from "@/src/features/scores/api/score-client-service";
import * as validation from "@/src/lib/validation";

type Props = {
  mode: "new" | "edit" | "copy";
  scoreId?: string;
  initialScore: any;
  allGenres: any[];
};

export function ScoreEditClient({ mode, scoreId, initialScore, allGenres }: Props) {
  const router = useRouter();
  const { user } = useAuth();

  // パンくずの共通化
  useEditPageBreadcrumbs("譜面", "/score", mode, scoreId);

  const [formData, setFormData] = useState({
    title: (mode === "copy" ? `${initialScore?.title}（コピー）` : initialScore?.title) || "",
    scoreUrl: initialScore?.scoreUrl || "",
    referenceTrack: initialScore?.referenceTrack || "",
    genres: (initialScore?.genres as string[]) || [""],
    abbreviation: initialScore?.abbreviation || "",
    note: initialScore?.note || "",
    isDispTop: mode === "new" ? true : (initialScore?.isDispTop ?? false),
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const e: { [key: string]: string } = {};
    if (!validation.isRequired(formData.title)) e.title = "必須項目です";
    if (!validation.isRequired(formData.scoreUrl)) {
      e.scoreUrl = "必須項目です";
    } else if (!validation.isValidGoogleDriveUrl(formData.scoreUrl)) {
      e.scoreUrl = "Google DriveのURL形式が不正です";
    }
    if (!validation.isRequired(formData.referenceTrack)) {
      e.referenceTrack = "必須項目です";
    } else if (!validation.isValidYouTubeUrl(formData.referenceTrack)) {
      e.referenceTrack = "YouTubeのURL形式が不正です";
    }
    if (!validation.isRequired(formData.abbreviation)) {
      e.abbreviation = "必須項目です";
    } else if (!validation.isMaxLength(formData.abbreviation, 8)) {
      e.abbreviation = "略称は8文字以内です";
    }
    if (!formData.genres[0]) e.genres = "最低1つ選択してください";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return showDialog("入力内容を確認してください", true);
    if (!(await showDialog(`${mode === "edit" ? "更新" : "登録"}しますか？`))) return;

    try {
      const finalId = await saveScore(mode, formData, scoreId, user?.displayName || undefined);
      await showDialog("保存しました", true);
      router.push(`/score/confirm?scoreId=${finalId}`);
    } catch (error) {
      console.error(error);
      await showDialog("保存に失敗しました", true);
    }
  };

  return (
    <BaseLayout>
      <EditFormLayout
        title={mode === "edit" ? "譜面編集" : "譜面新規作成"}
        mode={mode}
        onSave={handleSave}
        backHref={mode === "new" ? "/score" : `/score/confirm?scoreId=${scoreId}`}
        backText={mode === "new" ? "譜面一覧" : "譜面確認"}
      >
        <FormField label="タイトル" required error={errors.title}>
          <input type="text" className="form-control" value={formData.title} 
            onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
        </FormField>

        <FormField label="譜面（Google Drive URL）" required error={errors.scoreUrl}>
          <input type="text" className="form-control" value={formData.scoreUrl} 
            onChange={(e) => setFormData({ ...formData, scoreUrl: e.target.value })} />
        </FormField>

        <FormField label="参考音源（YouTube URL）" required error={errors.referenceTrack}>
          <input type="text" className="form-control" value={formData.referenceTrack} 
            onChange={(e) => setFormData({ ...formData, referenceTrack: e.target.value })} />
        </FormField>

        <FormField label="ジャンル" required error={errors.genres}>
          <GenreInput 
            genres={formData.genres} 
            allGenres={allGenres} 
            onChange={(newGenres) => setFormData({ ...formData, genres: newGenres })} 
          />
        </FormField>

        <FormField label="略称(譜割用)" required error={errors.abbreviation}>
          <input type="text" className="form-control" value={formData.abbreviation} 
            onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })} />
        </FormField>

        <FormField label="備考">
          <input type="text" className="form-control" value={formData.note} 
            onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
        </FormField>

        <div className="form-group checkbox-group">
          <label>
            <input type="checkbox" checked={formData.isDispTop} 
              onChange={(e) => setFormData({ ...formData, isDispTop: e.target.checked })} />
            ホームに表示
          </label>
        </div>
      </EditFormLayout>
    </BaseLayout>
  );
}