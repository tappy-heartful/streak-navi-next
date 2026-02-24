"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { showDialog } from "@/src/components/CommonDialog";
import { FormField } from "@/src/components/Form/FormField";
import { saveScore } from "../api/score-client-service.ts ";
import * as validation from "@/src/lib/validation";
import styles from "./score-edit.module.css";

type Props = {
  mode: "new" | "edit" | "copy";
  scoreId?: string;
  initialScore: any;
  allGenres: any[];
};

export function ScoreEditClient({ mode, scoreId, initialScore, allGenres }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

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

  useEffect(() => {
    const crumbs = [
      { title: "譜面一覧", href: "/score" },
      ...(mode !== "new" ? [{ title: "譜面確認", href: `/score/confirm?scoreId=${scoreId}` }] : []),
      { title: mode === "edit" ? "譜面編集" : "譜面新規作成", href: "" } // hrefを空文字で指定し型エラーを回避
    ];
    setBreadcrumbs(crumbs);
  }, [mode, scoreId, setBreadcrumbs]);

  const updateGenre = (index: number, value: string) => {
    const newGenres = [...formData.genres];
    newGenres[index] = value;
    setFormData({ ...formData, genres: newGenres });
  };

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
      e.abbreviation = "略称は8文字以内で入力してください";
    }
    if (!formData.genres[0]) e.genres = "最低1つは選択してください";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      await showDialog("入力内容を確認してください", true);
      return;
    }
    if (!(await showDialog(`${mode === "edit" ? "更新" : "登録"}しますか？`))) return;

    try {
      const finalId = await saveScore(mode, formData, scoreId, user?.displayName || undefined);
      await showDialog("保存しました", true);
      router.push(`/score/confirm?scoreId=${finalId}`);
    } catch (error) {
      console.error(error);
      await showDialog("保存中にエラーが発生しました", true);
    }
  };

  return (
    <main>
      <div className="page-header">
        <h1>{mode === "edit" ? "譜面編集" : "譜面新規作成"}</h1>
      </div>
      <div className="container">
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
          {formData.genres.map((selectedId: string, idx: number) => (
            <div key={idx} className={styles.genreSelectWrapper}>
              <select className={styles.scoreGenre} value={selectedId} onChange={(e) => updateGenre(idx, e.target.value)}>
                <option value="">選択してください</option>
                {allGenres.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              {formData.genres.length > 1 && (
                <button type="button" className={styles.removeGenre} onClick={() => {
                  const newGenres = formData.genres.filter((_, i: number) => i !== idx);
                  setFormData({ ...formData, genres: newGenres });
                }}>×</button>
              )}
            </div>
          ))}
          <button type="button" className={styles.addGenre} onClick={() => setFormData({ ...formData, genres: [...formData.genres, ""] })}>＋ ジャンルを追加</button>
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

        <div className="confirm-buttons">
          <button className="clear-button" onClick={() => router.refresh()}>クリア</button>
          <button className="save-button" onClick={handleSave}>{mode === "edit" ? "更新" : "登録"}</button>
        </div>
      </div>
      <div className="page-footer">
        <Link href={mode === "new" ? "/score" : `/score/confirm?scoreId=${scoreId}`} className="back-link">
          ← {mode === "new" ? "譜面一覧" : "譜面確認"}に戻る
        </Link>
      </div>
    </main>
  );
}