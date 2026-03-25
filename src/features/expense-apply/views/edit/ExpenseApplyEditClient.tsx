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
  getExpenseTypesClient,
  getExpenseCategoriesClient,
  getExpenseItemsClient,
  getTravelConfigClient,
  getUserLocationClient
} from "@/src/features/expense-apply/api/expense-apply-client-service";
import { getTravelSubsidyAmountClient } from "@/src/features/travel-subsidy/api/travel-subsidy-client-service";
import { ExpenseApply, Prefecture, Municipality, ExpenseType, ExpenseCategory, ExpenseItem, ExpenseApplyFormData } from "@/src/lib/firestore/types";
import { storage } from "@/src/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { showSpinner, hideSpinner, showDialog, dotDateToHyphen, hyphenDateToDot } from "@/src/lib/functions";
import { compressImage } from "@/src/lib/image-compression";
import { TravelRouteMap } from "@/src/components/TravelRouteMap";

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
  const [travelConfig, setTravelConfig] = useState<{ arrivalPoints: any[], departurePoints: any[] }>({ arrivalPoints: [], departurePoints: [] });

  useEffect(() => {
    const fetchMasters = async () => {
      const [t, c, i, conf] = await Promise.all([
        getExpenseTypesClient(),
        getExpenseCategoriesClient(),
        getExpenseItemsClient(),
        getTravelConfigClient()
      ]);
      setMasterTypes(t);
      setMasterCategories(c);
      setMasterItems(i);
      setTravelConfig(conf);
    };
    fetchMasters();
  }, []);

  const [departureMuns, setDepartureMuns] = useState<Municipality[]>([]);
  const [arrivalMuns, setArrivalMuns] = useState<Municipality[]>([]);

  const form = useAppForm(
    {
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

  // 初期値（出発地の自動設定）
  useEffect(() => {
    if (mode === "new" && user?.uid && !form.formData.departurePrefectureId) {
      const fetchDefaultLocation = async () => {
        const loc = await getUserLocationClient(user.uid);
        if (loc) {
          form.setFormData(prev => ({
            ...prev,
            departurePrefectureId: loc.prefectureId,
            departureMunicipalityId: loc.municipalityId
          }));
        }
      };
      fetchDefaultLocation();
    }
  }, [user?.uid, mode]);

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
      const muns = await getMunicipalitiesClient(form.formData.departurePrefectureId);
      setDepartureMuns(muns);
    };
    fetch();
  }, [form.formData.departurePrefectureId]);

  // 到着地市区町村の取得 (制限あり)
  useEffect(() => {
    if (!form.formData.arrivalPrefectureId) {
      setArrivalMuns([]);
      return;
    }
    const fetch = async () => {
      const muns = await getMunicipalitiesClient(form.formData.arrivalPrefectureId);
      // 到着地制限: travelConfig.arrivalPoints に含まれるもののみ
      const filtered = muns.filter(m => 
        travelConfig.arrivalPoints.some(p => p.prefectureId === form.formData.arrivalPrefectureId && p.municipalityId === m.id)
      );
      setArrivalMuns(filtered);

      // 到着市区町村が1つしかない場合は自動選択
      if (mode === "new" && filtered.length === 1 && !form.formData.arrivalMunicipalityId) {
        form.updateField("arrivalMunicipalityId", filtered[0].id);
      }
    };
    fetch();
  }, [form.formData.arrivalPrefectureId, travelConfig.arrivalPoints, mode, form.formData.arrivalMunicipalityId]);

  // 到着地の都道府県リストを制限
  const arrivalPrefectures = prefectures.filter(p => 
    travelConfig.arrivalPoints.some(pt => pt.prefectureId === p.id)
  );

  // 到着都道府県が1つしかない場合は自動選択
  useEffect(() => {
    if (mode === "new" && travelConfig.arrivalPoints.length > 0 && !form.formData.arrivalPrefectureId) {
      // ユニークな都道府県を集計
      const uniquePrefIds = Array.from(new Set(travelConfig.arrivalPoints.map(p => p.prefectureId)));
      if (uniquePrefIds.length === 1) {
        form.updateField("arrivalPrefectureId", uniquePrefIds[0]);
      }
    }
  }, [mode, travelConfig.arrivalPoints, form.formData.arrivalPrefectureId]);

  // 補助額の自動計算
  useEffect(() => {
    if (isTravel && form.formData.departureMunicipalityId && form.formData.arrivalMunicipalityId) {
      const fetchSubsidy = async () => {
        const amount = await getTravelSubsidyAmountClient(
          form.formData.departureMunicipalityId, 
          form.formData.arrivalMunicipalityId
        );
        if (amount !== null) {
          form.updateField("amount", amount);
        }

        // 経費名の自動設定
        const depMunName = departureMuns.find(m => m.id === form.formData.departureMunicipalityId)?.name || "";
        const arrMunName = arrivalMuns.find(m => m.id === form.formData.arrivalMunicipalityId)?.name || "";
        if (depMunName && arrMunName) {
          form.updateField("name", `旅費補助(往復) ${depMunName}⇔${arrMunName}`);
        }
      };
      fetchSubsidy();
    }
  }, [isTravel, form.formData.departureMunicipalityId, form.formData.arrivalMunicipalityId, departureMuns, arrivalMuns]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showSpinner();
    try {
      const compressed = await compressImage(file);
      const timestamp = new Date().getTime();
      const storagePath = `expenses/attachments/${timestamp}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      const snapshot = await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(snapshot.ref);

      setFiles(prev => [...prev, { name: file.name, url, path: storagePath }]);
    } catch (e) {
      console.error(e);
      await showDialog("ファイルのアップロードに失敗しました。");
    } finally {
      hideSpinner();
      e.target.value = "";
    }
  };

  const removeFile = async (index: number) => {
    const file = files[index];
    if (file.path) {
      showSpinner();
      try {
        const storageRef = ref(storage, file.path);
        await deleteObject(storageRef);
      } catch (e) {
        console.error(e);
      } finally {
        hideSpinner();
      }
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSaveApi = async (data: typeof form.formData) => {
    const itemName = masterItems.find(i => i.id === data.itemId)?.name || "";

    const payload: ExpenseApplyFormData = {
      ...data,
      category: itemName,
      date: hyphenDateToDot(data.date),
      files,
      isTravel: isTravel,
    };
    return saveExpenseApply(mode, payload, userData?.displayName || "不明", expenseId);
  };

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="経費申請"
        featureIdKey="expenseId"
        basePath="/expense-apply"
        mode={mode}
        dataId={expenseId}
        onSaveApi={onSaveApi}
        form={form}
        overrideAdmin={true}
      >
        <FormField label="経費種別" error={form.errors.typeId} required={true}>
          <select 
            value={form.formData.typeId} 
            onChange={(e) => {
              form.updateField("typeId", e.target.value);
            }}
            className="form-control"
          >
            <option value="">選択してください</option>
            {masterTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </FormField>

        {form.formData.typeId && (
          <FormField label="経費区分" error={form.errors.categoryId} required={true}>
            <select 
              value={form.formData.categoryId} 
              onChange={(e) => form.updateField("categoryId", e.target.value)}
              className="form-control"
            >
              <option value="">選択してください</option>
              {currentCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>
        )}

        {form.formData.categoryId && (
          <FormField label="経費項目" error={form.errors.itemId} required={true}>
            <select 
              value={form.formData.itemId} 
              onChange={(e) => {
                form.updateField("itemId", e.target.value);
                const item = currentItems.find(i => i.id === e.target.value);
                if (item?.isTravel) form.updateField("isTravel", true);
                else form.updateField("isTravel", false);
              }}
              className="form-control"
            >
              <option value="">選択してください</option>
              {currentItems.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </FormField>
        )}

        {isTravel && (
          <div style={{ padding: "15px", background: "#f8f9fa", borderRadius: "8px", marginBottom: "20px", border: "1px solid #dee2e6" }}>
            <h3 style={{ fontSize: "0.9rem", marginTop: 0 }}>旅費詳細</h3>
            
            <FormField label="出発地 (都道府県)" error={form.errors.departurePrefectureId} required={true}>
              <select 
                value={form.formData.departurePrefectureId} 
                onChange={(e) => form.updateField("departurePrefectureId", e.target.value)}
                className="form-control"
              >
                <option value="">選択してください</option>
                {prefectures.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="出発地 (市区町村)" error={form.errors.departureMunicipalityId} required={true}>
              <select 
                value={form.formData.departureMunicipalityId} 
                onChange={(e) => form.updateField("departureMunicipalityId", e.target.value)}
                className="form-control"
                disabled={!form.formData.departurePrefectureId}
              >
                <option value="">選択してください</option>
                {departureMuns.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </FormField>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", margin: "15px 0", color: "#1976d2", fontWeight: "bold" }}>
              <div style={{ height: "1px", flex: 1, background: "linear-gradient(to right, transparent, #1976d2)" }}></div>
              <i className="fas fa-exchange-alt"></i>
              <span>往復</span>
              <div style={{ height: "1px", flex: 1, background: "linear-gradient(to left, transparent, #1976d2)" }}></div>
            </div>

            <FormField label="到着地 (都道府県)" error={form.errors.arrivalPrefectureId} required={true}>
              <select 
                value={form.formData.arrivalPrefectureId} 
                onChange={(e) => form.updateField("arrivalPrefectureId", e.target.value)}
                className="form-control"
              >
                <option value="">選択してください</option>
                {arrivalPrefectures.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </FormField>

            <FormField label="到着地 (市区町村)" error={form.errors.arrivalMunicipalityId} required={true}>
              <select 
                value={form.formData.arrivalMunicipalityId} 
                onChange={(e) => form.updateField("arrivalMunicipalityId", e.target.value)}
                className="form-control"
                disabled={!form.formData.arrivalPrefectureId}
              >
                <option value="">選択してください</option>
                {arrivalMuns.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </FormField>
            
            {(form.formData.departureMunicipalityId && form.formData.arrivalMunicipalityId) && (
              <TravelRouteMap
                departurePrefecture={prefectures.find(p => p.id === form.formData.departurePrefectureId)?.name}
                departureMunicipality={departureMuns.find(m => m.id === form.formData.departureMunicipalityId)?.name}
                arrivalPrefecture={prefectures.find(p => p.id === form.formData.arrivalPrefectureId)?.name}
                arrivalMunicipality={arrivalMuns.find(m => m.id === form.formData.arrivalMunicipalityId)?.name}
                departureDate={form.formData.date}
                height="180px"
              />
            )}
          </div>
        )}

        {!isTravel && (
          <AppInput 
            label="項目名"
            field="name"
            value={form.formData.name}
            updateField={form.updateField}
            error={form.errors.name}
            required={true}
            placeholder="例: マウス、会場費など"
          />
        )}

        <AppInput 
          label="金額 (税込)"
          field="amount"
          value={form.formData.amount}
          updateField={form.updateField}
          error={form.errors.amount}
          type="number"
          required={true}
          placeholder="金額を入力"
          disabled={isTravel}
        />

        <AppInput 
          label="発生日"
          field="date"
          value={form.formData.date}
          updateField={form.updateField}
          error={form.errors.date}
          type="date"
          required={true}
        />

        <FormField label="添付ファイル (領収書など)">
          <div style={{ marginBottom: "10px" }}>
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} id="file-upload" />
            <label htmlFor="file-upload" className="list-add-button" style={{ display: "inline-block", cursor: "pointer", fontSize: "0.85rem", padding: "8px 16px" }}>
              画像をアップロード
            </label>
          </div>
          
          <ul style={{ listStyle: "none", padding: 0 }}>
            {files.map((file, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px", background: "#f1f3f4", borderRadius: "4px", marginBottom: "5px" }}>
                <span style={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "10px" }}>
                  {file.name}
                </span>
                <button type="button" onClick={() => removeFile(i)} style={{ background: "none", border: "none", color: "#d93025", cursor: "pointer" }}>
                  <i className="fas fa-times"></i>
                </button>
              </li>
            ))}
          </ul>
        </FormField>
      </EditFormLayout>
    </BaseLayout>
  );
}
