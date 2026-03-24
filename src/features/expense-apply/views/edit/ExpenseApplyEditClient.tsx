"use client";

import React, { useState, useEffect } from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useAuth } from "@/src/contexts/AuthContext";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { AppInput } from "@/src/components/Form/AppInput";
import { FormField } from "@/src/components/Form/FormField";
import { useAppForm } from "@/src/hooks/useAppForm";
import { rules } from "@/src/lib/validation";
import { 
  saveExpenseApply, 
  getMunicipalitiesClient, 
  calculateTravelSubsidyClient,
  getExpenseTypesClient,
  getExpenseCategoriesClient,
  getExpenseItemsClient
} from "@/src/features/expense-apply/api/expense-apply-client-service";
import { ExpenseApply, Prefecture, Municipality, ExpenseType, ExpenseCategory, ExpenseItem } from "@/src/lib/firestore/types";
import { storage } from "@/src/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { showSpinner, hideSpinner, showDialog, dotDateToHyphen, hyphenDateToDot } from "@/src/lib/functions";
import { compressImage } from "@/src/lib/image-compression";

type Props = {
  mode: "new" | "edit" | "copy";
  expenseId?: string;
  initialData: ExpenseApply | null;
  prefectures: Prefecture[];
};

export function ExpenseApplyEditClient({ mode, expenseId, initialData, prefectures }: Props) {
  const { user, userData } = useAuth();
  const [files, setFiles] = useState<{ name: string; url: string; path: string }[]>(
    initialData?.files || []
  );

  const [masterTypes, setMasterTypes] = useState<ExpenseType[]>([]);
  const [masterCategories, setMasterCategories] = useState<ExpenseCategory[]>([]);
  const [masterItems, setMasterItems] = useState<ExpenseItem[]>([]);

  useEffect(() => {
    const fetchMasters = async () => {
      const [t, c, i] = await Promise.all([
        getExpenseTypesClient(),
        getExpenseCategoriesClient(),
        getExpenseItemsClient()
      ]);
      setMasterTypes(t);
      setMasterCategories(c);
      setMasterItems(i);
    };
    fetchMasters();
  }, []);

  // 市区町村リストの状態
  const [departureMuns, setDepartureMuns] = useState<{ id: string; name: string }[]>([]);
  const [arrivalMuns, setArrivalMuns] = useState<{ id: string; name: string }[]>([]);

  const form = useAppForm(
    {
      type: initialData?.type || "expenditure",
      typeId: initialData?.typeId || "",
      category: initialData?.category || "",
      categoryId: initialData?.categoryId || "",
      itemId: initialData?.itemId || "",
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
      typeId: [rules.required],
      categoryId: [rules.required],
      itemId: [rules.required],
      name: [(v, data) => !data.isTravel && !v ? "項目名を入力してください" : true],
      amount: [rules.required, (v) => Number(v) > 0 || "1円以上の金額を入力してください"],
      date: [rules.required],
      departurePrefectureId: [(v, data) => data.isTravel && !v ? "出発県を選択してください" : true],
      departureMunicipalityId: [(v, data) => data.isTravel && !v ? "出発市区町村を選択してください" : true],
      arrivalPrefectureId: [(v, data) => data.isTravel && !v ? "到着県を選択してください" : true],
      arrivalMunicipalityId: [(v, data) => data.isTravel && !v ? "到着市区町村を選択してください" : true],
    }
  );

  const currentCategories = masterCategories.filter(c => c.typeId === form.formData.typeId);
  const currentItems = masterItems.filter(i => i.categoryId === form.formData.categoryId);
  const isTravel = masterItems.find(i => i.id === form.formData.itemId)?.isTravel || false;

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
    // 保存時に表示名も解決して入れる（互換性&リスト表示用）
    const typeName = masterTypes.find(t => t.id === data.typeId)?.name || "";
    const itemName = masterItems.find(i => i.id === data.itemId)?.name || "";

    const payload = {
      ...data,
      type: data.typeId === "001" ? "expenditure" : "income", // マスタに応じて設定
      category: itemName, // リスト表示用に項目の名前を入れる
      date: hyphenDateToDot(data.date),
      files,
      isTravel: isTravel,
    };
    return saveExpenseApply(mode, payload, userData?.displayName || "不明", expenseId);
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
        <FormField label="経費種別" required error={form.errors.typeId}>
          <select
            className="form-control"
            value={form.formData.typeId}
            onChange={(e) => {
              form.updateField("typeId", e.target.value);
              form.updateField("categoryId", "");
              form.updateField("itemId", "");
              form.updateField("isTravel", false);
            }}
          >
            <option value="">--- 種別を選択 ---</option>
            {masterTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </FormField>

        <FormField label="経費区分" required error={form.errors.categoryId}>
          <select
            className="form-control"
            value={form.formData.categoryId}
            onChange={(e) => {
              form.updateField("categoryId", e.target.value);
              form.updateField("itemId", "");
              form.updateField("isTravel", false);
            }}
            disabled={!form.formData.typeId}
          >
            <option value="">--- 区分を選択 ---</option>
            {currentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>

        <FormField label="経費項目" required error={form.errors.itemId}>
          <select
            className="form-control"
            value={form.formData.itemId}
            onChange={(e) => {
              const item = masterItems.find(i => i.id === e.target.value);
              form.updateField("itemId", e.target.value);
              form.updateField("isTravel", item?.isTravel || false);
              if (item?.isTravel) {
                form.updateField("name", ""); // 自動入力されるのでクリア
              }
            }}
            disabled={!form.formData.categoryId}
          >
            <option value="">--- 項目を選択 ---</option>
            {currentItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
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
