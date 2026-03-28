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
import styles from "./ExpenseApplyEdit.module.css";

type Props = {
  mode: "new" | "edit" | "copy";
  expenseId?: string;
  initialData: ExpenseApply | null;
  prefectures: Prefecture[];
  initialMasterTypes: ExpenseType[];
  initialMasterCategories: ExpenseCategory[];
  initialMasterItems: ExpenseItem[];
  initialTravelConfig: { arrivalPoints: any[], departurePoints: any[] };
  pastEvents: { id: string; title: string; date: string }[];
};

export function ExpenseApplyEditClient({
  mode,
  expenseId,
  initialData,
  prefectures,
  initialMasterTypes,
  initialMasterCategories,
  initialMasterItems,
  initialTravelConfig,
  pastEvents,
}: Props) {
  const { user, userData } = useAuth();
  const [files, setFiles] = useState<{ name: string; url: string; path: string }[]>(
    initialData?.files || []
  );

  const [masterTypes] = useState<ExpenseType[]>(initialMasterTypes);
  const [masterCategories] = useState<ExpenseCategory[]>(initialMasterCategories);
  const [masterItems] = useState<ExpenseItem[]>(initialMasterItems);
  const [travelConfig] = useState<{ arrivalPoints: any[], departurePoints: any[] }>(initialTravelConfig);

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
      eventId: initialData?.eventId || "",
    },
    {
      typeId: [rules.required],
      categoryId: [rules.required],
      itemId: [rules.required],
      name: [(v, data) => !data.isTravel && !v ? "項目名を入力してください" : true],
      amount: [rules.required, (v) => Number(v) > 0 || "1円以上の金額を入力してください"],
      date: [(v, data) => data.isTravel ? true : (rules.required(v) === true ? true : "発生日を入力してください")],
      departurePrefectureId: [(v, data) => data.isTravel && !v ? "出発県を選択してください" : true],
      departureMunicipalityId: [(v, data) => data.isTravel && !v ? "出発市区町村を選択してください" : true],
      arrivalPrefectureId: [(v, data) => data.isTravel && !v ? "到着県を選択してください" : true],
      arrivalMunicipalityId: [(v, data) => data.isTravel && !v ? "到着市区町村を選択してください" : true],
      eventId: [(v, data) => data.isTravel && !v ? "イベントを選択してください" : true],
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
        form.updateField("amount", amount ?? 0);

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
      const isPdf = file.type === "application/pdf";
      const uploadFile = isPdf ? file : await compressImage(file);
      const timestamp = new Date().getTime();
      const storagePath = `expenses/attachments/${timestamp}_${file.name}`;
      const storageRef = ref(storage, storagePath);

      const snapshot = await uploadBytes(storageRef, uploadFile);
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
    const selectedEvent = pastEvents.find(e => e.id === data.eventId);

    const payload: ExpenseApplyFormData = {
      ...data,
      category: itemName,
      date: isTravel && selectedEvent ? selectedEvent.date : hyphenDateToDot(data.date),
      files,
      isTravel: isTravel,
      eventId: isTravel ? (data.eventId || "") : "",
      eventTitle: isTravel ? (selectedEvent?.title || "") : "",
    };
    return saveExpenseApply(mode, payload, userData?.displayName || "不明", expenseId);
  };

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="経費申請"
        icon="fa-solid fa-receipt"
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
          <FormField label="対象イベント" error={form.errors.eventId} required={true}>
            <select
              value={form.formData.eventId}
              onChange={(e) => form.updateField("eventId", e.target.value)}
              className="form-control"
            >
              <option value="">選択してください</option>
              {pastEvents.map(e => (
                <option key={e.id} value={e.id}>{e.date} {e.title}</option>
              ))}
            </select>
          </FormField>
        )}

        {isTravel && (
          <div className={styles.travelSection}>
            <h3 className={styles.travelTitle}>旅費詳細</h3>

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

            <div className={styles.exchangeContainer}>
              <div className={styles.exchangeLineRight}></div>
              <i className="fas fa-exchange-alt"></i>
              <span>往復</span>
              <div className={styles.exchangeLineLeft}></div>
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
            placeholder="例: 練習会場費、譜面代など"
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

        {!isTravel && (
          <AppInput
            label="発生日"
            field="date"
            value={form.formData.date}
            updateField={form.updateField}
            error={form.errors.date}
            type="date"
            required={true}
          />
        )}

        <FormField label="添付ファイル (領収書など)">
          <div className={styles.fileUploadWrapper}>
            <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} style={{ display: "none" }} id="file-upload" />
            <label htmlFor="file-upload" className={styles.fileUploadLabel}>
              画像・PDFを追加
            </label>
          </div>

          <ul className={styles.fileList}>
            {files.map((file, i) => (
              <li key={i} className={styles.fileItem}>
                <span className={styles.fileName}>
                  {file.name}
                </span>
                <button type="button" onClick={() => removeFile(i)} className={styles.removeBtn}>
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
