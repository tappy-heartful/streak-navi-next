"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { showDialog } from "@/src/components/CommonDialog";
import { db } from "@/src/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
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
    genres: initialScore?.genres || [""],
    abbreviation: initialScore?.abbreviation || "",
    note: initialScore?.note || "",
    isDispTop: mode === "new" ? true : (initialScore?.isDispTop ?? false),
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const crumbs = [{ title: "譜面一覧", href: "/score" }];
    if (mode === "edit" || mode === "copy") {
      crumbs.push({ title: "譜面確認", href: `/score/confirm?scoreId=${scoreId}` });
    }
    // エラー箇所修正: href を必須としている型定義に合わせる
    crumbs.push({ title: mode === "edit" ? "譜面編集" : "譜面新規作成", href: "" });
    setBreadcrumbs(crumbs);
  }, [mode, scoreId, setBreadcrumbs]);

  const addGenre = () => setFormData({ ...formData, genres: [...formData.genres, ""] });
  const removeGenre = (index: number) => {
    const newGenres = formData.genres.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, genres: newGenres.length ? newGenres : [""] });
  };
  const updateGenre = (index: number, value: string) => {
    const newGenres = [...formData.genres];
    newGenres[index] = value;
    setFormData({ ...formData, genres: newGenres });
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.title.trim()) newErrors.title = "必須項目です";
    if (!formData.scoreUrl.trim()) {
      newErrors.scoreUrl = "必須項目です";
    } else if (!/^https:\/\/drive\.google\.com\/(file\/d\/[\w\-]+\/view|drive\/folders\/[\w\-]+)/.test(formData.scoreUrl)) {
      newErrors.scoreUrl = "Google DriveのURLではありません";
    }

    if (!formData.referenceTrack.trim()) {
      newErrors.referenceTrack = "必須項目です";
    } else if (!/^https:\/\/((www\.)?youtube\.com\/watch\?v=|youtu\.be\/)[\w\-]+/.test(formData.referenceTrack)) {
      newErrors.referenceTrack = "YouTube動画URLではありません";
    }

    if (!formData.abbreviation.trim()) {
      newErrors.abbreviation = "必須項目です";
    } else if (formData.abbreviation.length > 8) {
      newErrors.abbreviation = "略称は8文字以下です";
    }

    if (!formData.genres[0]) newErrors.genres = "最低1つ選択してください";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      await showDialog("入力内容を確認してください", true);
      return;
    }

    if (!(await showDialog(`${mode === "edit" ? "更新" : "登録"}しますか？`))) return;

    try {
      const payload = {
        ...formData,
        updatedAt: serverTimestamp(),
      };

      let finalId = scoreId;
      if (mode === "edit" && scoreId) {
        await updateDoc(doc(db, "scores", scoreId), payload);
      } else {
        const docRef = await addDoc(collection(db, "scores"), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: user?.displayName || "Unknown",
        });
        finalId = docRef.id;
      }

      await showDialog("保存しました", true);
      router.push(`/score/confirm?scoreId=${finalId}`);
    } catch (e) {
      console.error(e);
      await showDialog("保存に失敗しました", true);
    }
  };

  return (
    <main>
        <div className="page-header">
            <h1>{mode === "edit" ? "譜面編集" : "譜面新規作成"}</h1>
        </div>
        <div className="container">
            <div className="form-group">
                <label>タイトル <span className="required">*</span></label>
                <input 
                type="text" 
                className="form-control"
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                {errors.title && <div className="error-text">{errors.title}</div>}
            </div>

            <div className="form-group">
                <label>譜面（Google Drive） <span className="required">*</span></label>
                <input 
                type="text" 
                className="form-control"
                value={formData.scoreUrl} 
                onChange={(e) => setFormData({ ...formData, scoreUrl: e.target.value })}
                />
                {errors.scoreUrl && <div className="error-text">{errors.scoreUrl}</div>}
            </div>

            <div className="form-group">
                <label>参考音源（YouTube） <span className="required">*</span></label>
                <input 
                type="text" 
                className="form-control"
                value={formData.referenceTrack} 
                onChange={(e) => setFormData({ ...formData, referenceTrack: e.target.value })}
                />
                {errors.referenceTrack && <div className="error-text">{errors.referenceTrack}</div>}
            </div>

            <div className="form-group">
                <label>ジャンル <span className="required">*</span></label>
                <div id="genre-container">
                {formData.genres.map((selectedId: string, idx: number) => (
                    <div key={idx} className={styles.genreSelectWrapper}>
                    <select 
                        className={styles.scoreGenre}
                        value={selectedId}
                        onChange={(e) => updateGenre(idx, e.target.value)}
                    >
                        <option value="">選択してください</option>
                        {allGenres.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    {formData.genres.length > 1 && (
                        <button type="button" className={styles.removeGenre} onClick={() => removeGenre(idx)}>×</button>
                    )}
                    </div>
                ))}
                </div>
                <button type="button" className={styles.addGenre} onClick={addGenre}>＋ ジャンルを追加</button>
                {errors.genres && <div className="error-text">{errors.genres}</div>}
            </div>

            <div className="form-group">
                <label>略称(譜割用) <span className="required">*</span></label>
                <input 
                type="text" 
                className="form-control"
                value={formData.abbreviation} 
                onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                />
                {errors.abbreviation && <div className="error-text">{errors.abbreviation}</div>}
            </div>

            <div className="form-group">
                <label>備考</label>
                <input 
                type="text" 
                className="form-control"
                value={formData.note} 
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
            </div>

            <div className="form-group checkbox-group">
                <label>
                <input 
                    type="checkbox" 
                    checked={formData.isDispTop} 
                    onChange={(e) => setFormData({ ...formData, isDispTop: e.target.checked })}
                />
                ホームに表示
                </label>
            </div>

            <div className="confirm-buttons">
                <button className="clear-button" onClick={() => router.refresh()}>クリア</button>
                <button className="save-button" onClick={handleSave}>
                {mode === "edit" ? "更新" : "登録"}
                </button>
            </div>
        </div>
        <div className="page-footer">

            {mode === "new" ? (
                <Link prefetch={true} href="/score" className="back-link">
                    ← 譜面一覧に戻る
                </Link>
            ) : (
                <Link prefetch={true} href={`/score/confirm?scoreId=${scoreId}`} className="back-link">
                    ← 譜面確認に戻る
                </Link>
            )
            }
        </div>
    </main>
  );
}