"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { AppInput } from "@/src/components/Form/AppInput";
import { FormField } from "@/src/components/Form/FormField";
import { useAppForm } from "@/src/hooks/useAppForm";
import { rules } from "@/src/lib/validation";
import { Issue, User, Section, IssueStep, IssueFile, IssueLink, IssueGroup } from "@/src/lib/firestore/types";
import { saveIssue } from "@/src/features/issue/api/issue-client-service";
import { useAuth } from "@/src/contexts/AuthContext";
import { storage } from "@/src/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { showSpinner, hideSpinner, showDialog, dotDateToHyphen, hyphenDateToDot, format } from "@/src/lib/functions";
import { compressImage } from "@/src/lib/image-compression";
import styles from "./IssueEdit.module.css";

type Props = {
  mode: "new" | "edit" | "copy";
  issueId?: string;
  initialIssue: Issue | null;
  users: User[];
  sections: Section[];
  issueGroups: IssueGroup[];
};

export function IssueEditClient({ mode, issueId, initialIssue, users, sections, issueGroups }: Props) {
  const { userData } = useAuth();
  const router = useRouter();

  // 添付ファイルとステップの状態管理
  const [files, setFiles] = useState<IssueFile[]>(initialIssue?.files || []);
  const [steps, setSteps] = useState<IssueStep[]>(initialIssue?.steps || []);
  const [links, setLinks] = useState<IssueLink[]>(initialIssue?.links || []);
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>(initialIssue?.allowedUserIds || []);

  // セクションごとにユーザーをグループ化する
  const groupedUsers = React.useMemo(() => {
    const map: Record<string, User[]> = {};
    const noSection: User[] = [];

    // 初期化
    sections.forEach((s) => {
      map[s.id] = [];
    });

    users.forEach((u) => {
      if (u.sectionId && map[u.sectionId] !== undefined) {
        map[u.sectionId].push(u);
      } else {
        noSection.push(u);
      }
    });

    const result = sections
      .map((s) => ({
        section: s,
        members: map[s.id].sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "ja")),
      }))
      .filter((g) => g.members.length > 0);

    if (noSection.length > 0) {
      result.push({
        section: { id: "other", name: "その他・未設定" },
        members: noSection.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "ja")),
      });
    }

    return result;
  }, [users, sections]);

  const form = useAppForm(
    {
      type: initialIssue?.type || "todo",
      groupId: initialIssue?.groupId || "",
      assigneeId: initialIssue?.assigneeId || "",
      title: (mode === "copy" ? `${initialIssue?.title}（コピー）` : initialIssue?.title) ?? "",
      description: initialIssue?.description ?? "",
      date: dotDateToHyphen(initialIssue?.date || format(new Date(), "yyyy-MM-dd")),
      dateType: initialIssue?.dateType || "until",
      status: initialIssue?.status || "not_started",
      scope: initialIssue?.scope || "all",
    },
    {
      type: [rules.required],
      groupId: [],
      assigneeId: [rules.required],
      title: [rules.required],
      description: [rules.required],
      date: [rules.required],
      dateType: [rules.required],
      status: [rules.required],
      scope: [rules.required],
    }
  );

  // 公開範囲が「ユーザ指定」かつメンバーが選択されていない場合はバリデーションエラーを追加する独自のフック
  const customValidate = () => {
    const errs = form.validate();
    if (form.formData.scope === "user" && allowedUserIds.length === 0) {
      errs.scope = "公開するメンバーを1人以上選択してください。";
    }
    return errs;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showSpinner();
    try {
      const isPdf = file.type === "application/pdf";
      const uploadFile = isPdf ? file : await compressImage(file);
      const timestamp = Date.now();
      const storagePath = `issues/attachments/${timestamp}_${file.name}`;
      const storageRef = ref(storage, storagePath);

      const snapshot = await uploadBytes(storageRef, uploadFile);
      const url = await getDownloadURL(snapshot.ref);
      setFiles((prev) => [...prev, { name: file.name, url, path: storagePath }]);
    } catch (err) {
      console.error(err);
      await showDialog("ファイルのアップロードに失敗しました。");
    } finally {
      hideSpinner();
      e.target.value = "";
    }
  };

  const removeFile = async (index: number) => {
    const file = files[index];
    const confirmed = await showDialog(`「${file.name}」を削除しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      if (file.path) {
        const storageRef = ref(storage, file.path);
        await deleteObject(storageRef);
      }
      setFiles((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error(err);
      await showDialog("ファイルの削除に失敗しました。");
    } finally {
      hideSpinner();
    }
  };

  // ステップ（チェックリスト）操作
  const addStep = () => {
    setSteps((prev) => [...prev, { text: "", completed: false }]);
  };

  const updateStepText = (index: number, text: string) => {
    setSteps((prev) => {
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], text };
      return newSteps;
    });
  };

  const deleteStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  // 関連リンク操作
  const addLink = () => {
    setLinks((prev) => [...prev, { title: "", url: "" }]);
  };

  const updateLink = (index: number, field: "title" | "url", value: string) => {
    setLinks((prev) => {
      const newLinks = [...prev];
      newLinks[index] = { ...newLinks[index], [field]: value };
      return newLinks;
    });
  };

  const deleteLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // ユーザ指定の公開範囲制御
  const toggleMemberSelection = (uid: string) => {
    setAllowedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const onSaveApi = async (data: typeof form.formData) => {
    const selectedAssignee = users.find((u) => u.id === data.assigneeId);
    const assigneeName = selectedAssignee?.displayName || "";

    const payload = {
      type: data.type as "todo" | "bug" | "question",
      groupId: data.groupId || "",
      assigneeId: data.assigneeId,
      assigneeName,
      title: data.title,
      description: data.description,
      date: hyphenDateToDot(data.date),
      dateType: data.dateType as "until" | "on",
      status: data.status as "not_started" | "in_progress" | "completed",
      scope: data.scope as "all" | "part" | "user",
      partId: data.scope === "part" ? (userData?.sectionId || "") : "",
      allowedUserIds: data.scope === "user" ? allowedUserIds : [],
      steps: steps.filter((step) => step.text.trim().length > 0),
      links: links.filter((link) => link.title.trim() && link.url.trim()),
      files,
    };

    return saveIssue(mode, payload, userData?.displayName || "不明", issueId);
  };

  const inputProps = (field: keyof typeof form.formData) => ({
    field,
    value: form.formData[field],
    error: form.errors[field],
    updateField: form.updateField,
  });

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="TODO"
        icon="fa-solid fa-list-check"
        featureIdKey="issueId"
        basePath="/issue"
        dataId={issueId}
        mode={mode}
        form={{ ...form, validate: customValidate }}
        onSaveApi={onSaveApi}
        overrideAdmin={true} // 起票・編集は全ユーザーに許可するため常に認証突破させる
      >
        {/* 種類 (Type) */}
        <FormField label="種類" error={form.errors.type} required={true}>
          <select
            className="form-control"
            value={form.formData.type}
            onChange={(e) => form.updateField("type", e.target.value)}
          >
            <option value="todo">TODO</option>
            <option value="bug">課題</option>
            <option value="question">質問</option>
          </select>
        </FormField>

        {/* グループ */}
        <FormField label="グループ" error={form.errors.groupId}>
          <select
            className="form-control"
            value={form.formData.groupId}
            onChange={(e) => form.updateField("groupId", e.target.value)}
          >
            <option value="">未分類</option>
            {issueGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </FormField>

        {/* 担当者 (Assignee) */}
        <FormField label="担当者" error={form.errors.assigneeId} required={true}>
          <select
            className="form-control"
            value={form.formData.assigneeId}
            onChange={(e) => form.updateField("assigneeId", e.target.value)}
          >
            <option value="">選択してください</option>
            {groupedUsers.map((g) => (
              <optgroup key={g.section.id} label={g.section.name}>
                {g.members.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName || "匿名"}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </FormField>

        {/* タイトル */}
        <AppInput
          label="タイトル"
          required={true}
          placeholder="タイトルを入力してください"
          {...inputProps("title")}
        />

        {/* 説明 */}
        <AppInput
          label="説明"
          type="textarea"
          required={true}
          placeholder="詳細な説明や目的を入力してください"
          {...inputProps("description")}
        />

        {/* ステップ (チェックリスト) */}
        <FormField label="ステップ (チェックリスト)">
          <ul className={styles.stepList}>
            {steps.map((step, idx) => (
              <li key={idx} className={styles.stepItem}>
                <input
                  type="text"
                  className={`${styles.stepInput} form-control`}
                  value={step.text}
                  placeholder={`ステップ ${idx + 1} の内容を入力`}
                  onChange={(e) => updateStepText(idx, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => deleteStep(idx)}
                  className={styles.deleteStepBtn}
                  title="ステップを削除"
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={addStep} className={styles.addStepBtn}>
            <i className="fa-solid fa-plus"></i> ステップを追加
          </button>
        </FormField>

        {/* 関連リンク */}
        <FormField label="関連リンク">
          <ul className={styles.linkList}>
            {links.map((link, idx) => (
              <li key={idx} className={styles.linkItem}>
                <input
                  type="text"
                  className={`${styles.linkTitleInput} form-control`}
                  value={link.title}
                  placeholder="サイトのタイトル (例: 参考URL, 関連ページ)"
                  onChange={(e) => updateLink(idx, "title", e.target.value)}
                />
                <input
                  type="url"
                  className={`${styles.linkUrlInput} form-control`}
                  value={link.url}
                  placeholder="URL (https://...)"
                  onChange={(e) => updateLink(idx, "url", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => deleteLink(idx)}
                  className={styles.deleteStepBtn}
                  title="リンクを削除"
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={addLink} className={styles.addStepBtn}>
            <i className="fa-solid fa-plus"></i> リンクを追加
          </button>
        </FormField>

        {/* 期限日 */}
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ flex: 1 }}>
            <AppInput
              label="期限日"
              type="date"
              required={true}
              {...inputProps("date")}
            />
          </div>
          <div style={{ width: "120px" }}>
            <FormField label="期限指定" error={form.errors.dateType} required={true}>
              <select
                className="form-control"
                value={form.formData.dateType}
                onChange={(e) => form.updateField("dateType", e.target.value)}
              >
                <option value="until">まで</option>
                <option value="on">に</option>
              </select>
            </FormField>
          </div>
        </div>

        {/* ステータス */}
        <FormField label="ステータス" error={form.errors.status} required={true}>
          <select
            className="form-control"
            value={form.formData.status}
            onChange={(e) => form.updateField("status", e.target.value)}
          >
            <option value="not_started">未</option>
            <option value="in_progress">実施中</option>
            <option value="completed">済</option>
          </select>
        </FormField>

        {/* 公開範囲 */}
        <FormField label="公開範囲" error={form.errors.scope} required={true}>
          <select
            className="form-control"
            value={form.formData.scope}
            onChange={(e) => {
              form.updateField("scope", e.target.value);
            }}
          >
            <option value="all">全体</option>
            <option value="user">ユーザ指定</option>
          </select>
        </FormField>

        {/* 公開メンバーの選択 (ユーザ指定時) */}
        {form.formData.scope === "user" && (
          <FormField label="公開するメンバー" error={form.errors.scope} required={true}>
            <div className={styles.memberChecklist}>
              {groupedUsers.map((g) => (
                <div key={g.section.id} className={styles.sectionGroup}>
                  <div className={styles.sectionHeader}>{g.section.name}</div>
                  <div className={styles.sectionMembers}>
                    {g.members.map((u) => (
                      <label key={u.id} className={styles.memberLabel}>
                        <input
                          type="checkbox"
                          className={styles.memberCheckbox}
                          checked={allowedUserIds.includes(u.id)}
                          onChange={() => toggleMemberSelection(u.id)}
                        />
                        <span>{u.displayName || "匿名"}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </FormField>
        )}

        {/* 添付ファイル */}
        <FormField label="添付ファイル (画像・PDF)">
          <div className={styles.fileUploadWrapper}>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              style={{ display: "none" }}
              id="issue-file-upload"
            />
            <label htmlFor="issue-file-upload" className={styles.fileUploadLabel}>
              <i className="fa-solid fa-cloud-arrow-up"></i> ファイルを追加
            </label>
          </div>

          <ul className={styles.fileList}>
            {files.map((file, i) => (
              <li key={i} className={styles.fileItem}>
                <span className={styles.fileName}>{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className={styles.removeFileBtn}
                  title="削除"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </li>
            ))}
          </ul>
        </FormField>
      </EditFormLayout>
    </BaseLayout>
  );
}
