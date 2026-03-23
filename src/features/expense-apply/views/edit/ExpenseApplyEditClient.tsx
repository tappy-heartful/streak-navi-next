"use client";

import React, { useState, useEffect } from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useAuth } from "@/src/contexts/AuthContext";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { AppInput } from "@/src/components/Form/AppInput";
import { FormField } from "@/src/components/Form/FormField";
import { useAppForm } from "@/src/hooks/useAppForm";
import { rules } from "@/src/lib/validation";
import { ExpenseApply, Prefecture, Municipality } from "@/src/lib/firestore/types";
import { 
  saveExpenseApply, 
  getMunicipalitiesClient, 
  calculateTravelSubsidyClient 
} from "@/src/features/expense-apply/api/expense-apply-client-service";
import { storage } from "@/src/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { showSpinner, hideSpinner, showDialog, dotDateToHyphen, hyphenDateToDot } from "@/src/lib/functions";
import { compressImage } from "@/src/features/expense-apply/lib/image-compression";

type Props = {
  mode: "new" | "edit" | "copy";
  expenseId?: string;
  initialData: ExpenseApply | null;
  prefectures: Prefecture[];
};

const EXPENSE_CATEGORIES = {
  expenditure: ["バンド資産購入", "旅費", "ライブ参加費", "譜面購入", "練習会場費", "その他"],
  income: ["ライブ謝礼金", "その他"],
};

export function ExpenseApplyEditClient({ mode, expenseId, initialData, prefectures }: Props) {
  const { user } = useAuth();
  const [files, setFiles] = useState<{ name: string; url: string; path: string }[]>(
    initialData?.files || []
  );

  // 市区町村リストの状態
  const [departureMuns, setDepartureMuns] = useState<{ id: string; name: string }[]>([]);
  const [arrivalMuns, setArrivalMuns] = useState<{ id: string; name: string }[]>([]);

  const form = useAppForm(
    {
      type: initialData?.type || "expenditure",
      category: initialData?.category || "",
      name: initialData?.name || "",
      amount: initialData?.amount || 0,
      date: dotDateToHyphen(initialData?.date || new Date().toISOString().split('T')[0]),
      departurePrefectureId: initialData?.departurePrefectureId || "",
      departureMunicipalityId: initialData?.departureMunicipalityId || "",
      arrivalPrefectureId: initialData?.arrivalPrefectureId || "",
      arrivalMunicipalityId: initialData?.arrivalMunicipalityId || "",
      isTravel: initialData?.isTravel || false,
    },
    {
      type: [rules.required],
      category: [rules.required],
      name: [(v, data) => data.category !== "旅費" && !v ? "項目名を入力してください" : true],
      amount: [rules.required, (v) => Number(v) > 0 || "1円以上の金額を入力してください"],
      date: [rules.required],
      departurePrefectureId: [(v, data) => data.category === "旅費" && !v ? "出発県を選択してください" : true],
      departureMunicipalityId: [(v, data) => data.category === "旅費" && !v ? "出発市区町村を選択してください" : true],
      arrivalPrefectureId: [(v, data) => data.category === "旅費" && !v ? "到着県を選択してください" : true],
      arrivalMunicipalityId: [(v, data) => data.category === "旅費" && !v ? "到着市区町村を選択してください" : true],
    }
  );

  const isExpenditure = form.formData.type === "expenditure";
  const isTravel = form.formData.category === "旅費";
  const categories = isExpenditure ? EXPENSE_CATEGORIES.expenditure : EXPENSE_CATEGORIES.income;

  // 出発地市区町村の取得
  useEffect(() => {
    if (!form.formData.departurePrefectureId) {
      setDepartureMuns([]);
      return;
    }
    const fetch = async () => {
      const list = await getMunicipalitiesClient(form.formData.departurePrefectureId);
      setDepartureMuns(list);
    };
    fetch();
  }, [form.formData.departurePrefectureId]);

  // 到着地市区町村の取得
  useEffect(() => {
    if (!form.formData.arrivalPrefectureId) {
      setArrivalMuns([]);
      return;
    }
    const fetch = async () => {
      const list = await getMunicipalitiesClient(form.formData.arrivalPrefectureId);
      setArrivalMuns(list);
    };
    fetch();
  }, [form.formData.arrivalPrefectureId]);

  // 旅費の自動計算
  useEffect(() => {
    if (isTravel && form.formData.departureMunicipalityId && form.formData.arrivalMunicipalityId) {
      const calc = async () => {
        const subsidy = await calculateTravelSubsidyClient(
          form.formData.departureMunicipalityId,
          form.formData.arrivalMunicipalityId
        );
        form.updateField("amount", subsidy);
        // 名前も自動生成
        const depMun = departureMuns.find(m => m.id === form.formData.departureMunicipalityId)?.name || "";
        const arrMun = arrivalMuns.find(m => m.id === form.formData.arrivalMunicipalityId)?.name || "";
        if (depMun && arrMun) {
          form.updateField("name", `${depMun}〜${arrMun} 旅費補助`);
        }
      };
      calc();
    }
  }, [isTravel, form.formData.departureMunicipalityId, form.formData.arrivalMunicipalityId, departureMuns, arrivalMuns]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    showSpinner();
    try {
      const newFiles = [...files];
      for (let i = 0; i < selectedFiles.length; i++) {
        let file = selectedFiles[i];
        
        // 画像なら圧縮
        if (file.type.startsWith('image/')) {
          file = await compressImage(file);
        }

        const fileName = file.name;
        const path = `expenses/attachments/${Date.now()}_${fileName}`;
        const storageRef = ref(storage, path);
        
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newFiles.push({ name: fileName, url, path });
      }
      setFiles(newFiles);
    } catch (err) {
      console.error(err);
      showDialog("アップロードに失敗しました");
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
      const storageRef = ref(storage, file.path);
      await deleteObject(storageRef);
      const newFiles = [...files];
      newFiles.splice(index, 1);
      setFiles(newFiles);
    } catch (err) {
      console.error(err);
      showDialog("ファイルの削除に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const onSave = async (data: any) => {
    const payload = {
      ...data,
      date: hyphenDateToDot(data.date),
      files,
      isTravel: data.category === "旅費",
    };
    return saveExpenseApply(mode, payload, expenseId);
  };

  const isOwn = !initialData || user?.uid === initialData.uid;
  const isPending = !initialData || initialData.status === "pending";

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="経費申請"
        featureIdKey="expenseId"
        basePath="/expense-apply"
        dataId={expenseId}
        mode={mode}
        overrideAdmin={isOwn && isPending}
        form={form}
        onSaveApi={onSave}
      >
        <FormField label="種別" required error={form.errors.type}>
          <div style={{ display: "flex", gap: "20px", marginTop: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input 
                type="radio" 
                name="type" 
                value="expenditure" 
                checked={form.formData.type === "expenditure"} 
                onChange={() => {
                  form.updateField("type", "expenditure");
                  form.updateField("category", "");
                }}
              />
              支出
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
              <input 
                type="radio" 
                name="type" 
                value="income" 
                checked={form.formData.type === "income"} 
                onChange={() => {
                  form.updateField("type", "income");
                  form.updateField("category", "");
                }}
              />
              収入
            </label>
          </div>
        </FormField>

        <FormField label="項目" required error={form.errors.category}>
          <select
            className="form-control"
            value={form.formData.category}
            onChange={(e) => {
              form.updateField("category", e.target.value);
              if (e.target.value !== "旅費") {
                form.updateField("isTravel", false);
              } else {
                form.updateField("isTravel", true);
              }
            }}
          >
            <option value="">--- 項目を選択 ---</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>

        {isTravel && (
          <div style={{ background: "#f9f9f9", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
            <h4 style={{ fontSize: "0.9rem", color: "#666", marginBottom: "10px" }}>旅費詳細</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <FormField label="出発県" required error={form.errors.departurePrefectureId}>
                <select
                  className="form-control"
                  value={form.formData.departurePrefectureId}
                  onChange={(e) => {
                    form.updateField("departurePrefectureId", e.target.value);
                    form.updateField("departureMunicipalityId", "");
                  }}
                >
                  <option value="">(選択)</option>
                  {prefectures.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </FormField>
              <FormField label="出発市区町村" required error={form.errors.departureMunicipalityId}>
                <select
                  className="form-control"
                  value={form.formData.departureMunicipalityId}
                  onChange={(e) => form.updateField("departureMunicipalityId", e.target.value)}
                  disabled={!form.formData.departurePrefectureId}
                >
                  <option value="">(選択)</option>
                  {departureMuns.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </FormField>
              <FormField label="到着県" required error={form.errors.arrivalPrefectureId}>
                <select
                  className="form-control"
                  value={form.formData.arrivalPrefectureId}
                  onChange={(e) => {
                    form.updateField("arrivalPrefectureId", e.target.value);
                    form.updateField("arrivalMunicipalityId", "");
                  }}
                >
                  <option value="">(選択)</option>
                  {prefectures.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </FormField>
              <FormField label="到着市区町村" required error={form.errors.arrivalMunicipalityId}>
                <select
                  className="form-control"
                  value={form.formData.arrivalMunicipalityId}
                  onChange={(e) => form.updateField("arrivalMunicipalityId", e.target.value)}
                  disabled={!form.formData.arrivalPrefectureId}
                >
                  <option value="">(選択)</option>
                  {arrivalMuns.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </FormField>
            </div>
          </div>
        )}

        <AppInput 
          label="経費名" 
          required 
          field="name" 
          value={form.formData.name} 
          error={form.errors.name} 
          updateField={form.updateField} 
          placeholder={isTravel ? "自動入力されます" : "具体的な経費名を入力"}
          disabled={isTravel && !!form.formData.departureMunicipalityId && !!form.formData.arrivalMunicipalityId}
        />

        <AppInput 
          label="金額 (円)" 
          type="number" 
          required 
          field="amount" 
          value={form.formData.amount} 
          error={form.errors.amount} 
          updateField={form.updateField} 
          disabled={isTravel}
        />

        <FormField label="日付" required error={form.errors.date}>
          <input 
            type="date" 
            className="form-control" 
            value={form.formData.date} 
            onChange={(e) => form.updateField("date", e.target.value)}
          />
        </FormField>

        <FormField label="領収書・証明写真等">
          <div style={{ marginBottom: "1rem" }}>
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="expense-file-input"
            />
            <button
              type="button"
              className="list-add-button"
              style={{ margin: "10px 0" }}
              onClick={() => document.getElementById("expense-file-input")?.click()}
            >
              <i className="fas fa-plus"></i> ファイルを追加
            </button>
          </div>
          
          {files.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {files.map((file, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "#f9f9f9", borderRadius: "4px", marginBottom: "4px" }}>
                  <i className="far fa-file"></i>
                  <span style={{ flex: 1, fontSize: "0.9rem" }}>{file.name}</span>
                  <button type="button" className="remove-room-button" onClick={() => removeFile(i)} style={{ padding: "4px 8px" }}>
                    <i className="fas fa-times"></i>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FormField>
      </EditFormLayout>
    </BaseLayout>
  );
}
