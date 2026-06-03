"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { showSpinner, hideSpinner, showDialog, dotDateToHyphen, hyphenDateToDot, writeLog, getAccountingSeasonTheme } from "@/src/lib/functions";
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
  pastEvents: { id: string; title: string; date: string; prefectureId?: string; municipalityId?: string }[];
  queryParams?: {
    typeId?: string;
    categoryId?: string;
    itemId?: string;
    eventId?: string;
  };
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
  queryParams,
}: Props) {
  const { user, userData, isAdmin } = useAuth();
  const router = useRouter();
  const seasonTheme = getAccountingSeasonTheme(initialData?.createdAt);
  const [files, setFiles] = useState<{ name: string; url: string; path: string }[]>(
    initialData?.files || []
  );

  const [masterTypes] = useState<ExpenseType[]>(initialMasterTypes);
  const [masterCategories] = useState<ExpenseCategory[]>(initialMasterCategories);
  const [masterItems] = useState<ExpenseItem[]>(initialMasterItems);
  const [travelConfig] = useState<{ arrivalPoints: any[], departurePoints: any[] }>(initialTravelConfig);

  const [departureMuns, setDepartureMuns] = useState<Municipality[]>([]);
  const [arrivalMuns, setArrivalMuns] = useState<Municipality[]>([]);

  const initialItem = masterItems.find(i => i.id === (initialData?.itemId || queryParams?.itemId));

  const form = useAppForm(
    {
      typeId: initialData?.typeId || queryParams?.typeId || "",
      category: initialData?.category || "",
      categoryId: initialData?.categoryId || queryParams?.categoryId || "",
      itemId: initialData?.itemId || queryParams?.itemId || "",
      name: initialData?.name || "",
      amount: initialData?.amount || 0,
      date: dotDateToHyphen(initialData?.date || new Date().toISOString().split('T')[0]),
      departurePrefectureId: initialData?.departurePrefectureId || "",
      departureMunicipalityId: initialData?.departureMunicipalityId || "",
      arrivalPrefectureId: initialData?.arrivalPrefectureId || "",
      arrivalMunicipalityId: initialData?.arrivalMunicipalityId || "",
      isTravel: initialData?.isTravel || initialItem?.isTravel || false,
      isEventRequired: initialData?.isEventRequired || initialItem?.isEventRequired || false,
      eventId: initialData?.eventId || queryParams?.eventId || "",
    },
    {
      typeId: [rules.required],
      categoryId: [rules.required],
      itemId: [rules.required],
      name: [(v, data) => !data.isTravel && !v ? "項目名を入力してください" : true],
      amount: [rules.required, (v) => Number(v) > 0 || "1円以上の金額を入力してください"],
      date: [(v, data) => data.isEventRequired ? true : (rules.required(v) === true ? true : "発生日を入力してください")],
      departurePrefectureId: [(v, data) => data.isTravel && !v ? "出発県を選択してください" : true],
      departureMunicipalityId: [(v, data) => data.isTravel && !v ? "出発市区町村を選択してください" : true],
      arrivalPrefectureId: [(v, data) => data.isTravel && !v ? "到着県を選択してください" : true],
      arrivalMunicipalityId: [(v, data) => data.isTravel && !v ? "到着市区町村を選択してください" : true],
      eventId: [(v, data) => data.isEventRequired && !v ? "イベントを選択してください" : true],
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
            departurePrefectureId: loc.prefectureId || "",
            departureMunicipalityId: loc.municipalityId || ""
          }));
        }
      };
      fetchDefaultLocation();
    }
  }, [user?.uid, mode]);

  const currentCategories = masterCategories.filter(c => c.typeId === form.formData.typeId);
  const currentItems = masterItems.filter(i => i.categoryId === form.formData.categoryId);
  const selectedItem = masterItems.find(i => i.id === form.formData.itemId);
  const isTravel = selectedItem?.isTravel || false;
  const isEventRequired = selectedItem?.isEventRequired || false;

  // 選択されたイベント
  const selectedEvent = form.formData.eventId ? pastEvents.find(e => e.id === form.formData.eventId) : null;

  // イベント選択時に目的地の都道府県・市区町村を自動設定
  const prevEventIdRef = React.useRef<string>(form.formData.eventId);
  useEffect(() => {
    const prevEventId = prevEventIdRef.current;
    prevEventIdRef.current = form.formData.eventId;

    if (isTravel && form.formData.eventId) {
      const selEv = pastEvents.find(e => e.id === form.formData.eventId);
      if (selEv?.prefectureId && selEv?.municipalityId) {
        // 条件：
        // 1. 新規登録(mode === "new")で、かつ初期表示時 (arrivalPrefectureIdが未設定) の場合
        // 2. または、イベントの選択が変更された場合 (prevEventId !== form.formData.eventId)
        const isInitialNew = mode === "new" && !form.formData.arrivalPrefectureId;
        const isEventChanged = prevEventId !== form.formData.eventId;

        if (isInitialNew || isEventChanged) {
          form.setFormData(prev => ({
            ...prev,
            arrivalPrefectureId: selEv.prefectureId || "",
            arrivalMunicipalityId: selEv.municipalityId || ""
          }));
        }
      }
    }
  }, [isTravel, form.formData.eventId, pastEvents, mode, form.formData.arrivalPrefectureId]);

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

  // 到着地市区町村の取得 (制限あり、選択されたイベントの目的地は特別に許可)
  useEffect(() => {
    if (!form.formData.arrivalPrefectureId) {
      setArrivalMuns([]);
      return;
    }
    const fetch = async () => {
      const muns = await getMunicipalitiesClient(form.formData.arrivalPrefectureId);
      // 到着地制限: travelConfig.arrivalPoints に含まれるもの、または選択されたイベントの目的地
      const filtered = muns.filter(m =>
        travelConfig.arrivalPoints.some(p => p.prefectureId === form.formData.arrivalPrefectureId && p.municipalityId === m.id) ||
        (selectedEvent && selectedEvent.prefectureId === form.formData.arrivalPrefectureId && selectedEvent.municipalityId === m.id)
      );
      setArrivalMuns(filtered);

      // 到着市区町村が1つしかない場合は自動選択
      if (mode === "new" && filtered.length === 1 && !form.formData.arrivalMunicipalityId) {
        form.updateField("arrivalMunicipalityId", filtered[0].id);
      }
    };
    fetch();
  }, [form.formData.arrivalPrefectureId, travelConfig.arrivalPoints, mode, form.formData.arrivalMunicipalityId, selectedEvent]);

  // 到着地の都道府県リストを制限 (選択されたイベントの都道府県は特別に許可)
  const arrivalPrefectures = prefectures.filter(p =>
    travelConfig.arrivalPoints.some(pt => pt.prefectureId === p.id) ||
    (selectedEvent && selectedEvent.prefectureId === p.id)
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

  // 補助額の自動計算（サイレント：ダイアログは出さない。ただし初期表示時は未設定時にダイアログを出す）
  const hasCheckedInitial = React.useRef(false);
  useEffect(() => {
    if (isTravel && form.formData.departureMunicipalityId && form.formData.arrivalMunicipalityId) {
      const fetchSubsidy = async () => {
        const amount = await getTravelSubsidyAmountClient(
          form.formData.departureMunicipalityId,
          form.formData.arrivalMunicipalityId
        );
        form.updateField("amount", amount ?? 0);

        const depMunName = departureMuns.find(m => m.id === form.formData.departureMunicipalityId)?.name || "";
        const arrMunName = arrivalMuns.find(m => m.id === form.formData.arrivalMunicipalityId)?.name || "";

        if (amount !== null) {
          if (depMunName && arrMunName) {
            form.updateField("name", `旅費補助(往復) ${depMunName}⇔${arrMunName}`);
          }
        } else {
          // 初期表示時に未設定の場合のみダイアログ表示
          if (depMunName && arrMunName && !hasCheckedInitial.current) {
            hasCheckedInitial.current = true;
            if (isAdmin) {
              const goToSetting = await showDialog(
                `${depMunName}⇔${arrMunName} の旅費額が未設定です。\n旅費補助額設定画面に移動しますか？`
              );
              if (goToSetting) router.push("/travel-subsidy");
            } else {
              await showDialog(
                `${depMunName}⇔${arrMunName} の旅費額が未設定です。\n管理者にご連絡ください。`,
                true
              );
            }
          }
        }
      };
      fetchSubsidy();
    }
  }, [
    isTravel,
    form.formData.departureMunicipalityId,
    form.formData.arrivalMunicipalityId,
    departureMuns,
    arrivalMuns,
    isAdmin,
    router
  ]);

  // 市区町村が確定したとき（ユーザ操作時のみ）に未設定ダイアログを表示
  const handleSubsidyCheck = async (depMunId: string, arrMunId: string) => {
    if (!depMunId || !arrMunId) return;
    const amount = await getTravelSubsidyAmountClient(depMunId, arrMunId);
    if (amount !== null) return;

    const depMunName = departureMuns.find(m => m.id === depMunId)?.name || "";
    const arrMunName = arrivalMuns.find(m => m.id === arrMunId)?.name || "";

    if (isAdmin) {
      const goToSetting = await showDialog(
        `${depMunName}⇔${arrMunName} の旅費額が未設定です。\n旅費補助額設定画面に移動しますか？`
      );
      if (goToSetting) router.push("/travel-subsidy");
    } else {
      await showDialog(
        `${depMunName}⇔${arrMunName} の旅費額が未設定です。\n管理者にご連絡ください。`,
        true
      );
    }
  };

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
      await writeLog({ dataId: storagePath, action: "経費申請ファイルアップロード" });
      setFiles(prev => [...prev, { name: file.name, url, path: storagePath }]);
    } catch (e) {
      console.error(e);
      await writeLog({ dataId: "upload", action: "経費申請ファイルアップロード", status: "error", errorDetail: { message: (e as Error).message } });
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
        await writeLog({ dataId: file.path, action: "経費申請ファイル削除" });
      } catch (e) {
        console.error(e);
        await writeLog({ dataId: file.path, action: "経費申請ファイル削除", status: "error", errorDetail: { message: (e as Error).message } });
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
      expenseTypeId: data.typeId, // ドキュメントIDを明示的に登録
      category: itemName,
      date: isEventRequired && selectedEvent ? selectedEvent.date : hyphenDateToDot(data.date),
      files,
      isTravel,
      isEventRequired,
      eventId: isEventRequired ? (data.eventId || "") : "",
      eventTitle: isEventRequired ? (selectedEvent?.title || "") : "",
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
        <div style={{
          background: seasonTheme.gradient,
          color: "white",
          borderRadius: "12px",
          padding: "14px 20px",
          marginBottom: "24px",
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "1rem",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.1rem" }}>
            <i className="fa-solid fa-scale-balanced"></i>
            <span>計上対象: {seasonTheme.label}シーズン</span>
          </div>
          <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>
            対象期間: {seasonTheme.period}（精算: {seasonTheme.settlementMonth}）
          </div>
        </div>

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
                form.setFormData(prev => ({
                  ...prev,
                  isTravel: item?.isTravel || false,
                  isEventRequired: item?.isEventRequired || false
                }));
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

        {isEventRequired && (
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
                onChange={(e) => {
                  form.updateField("departureMunicipalityId", e.target.value);
                  handleSubsidyCheck(e.target.value, form.formData.arrivalMunicipalityId);
                }}
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
                onChange={(e) => {
                  form.updateField("arrivalMunicipalityId", e.target.value);
                  handleSubsidyCheck(form.formData.departureMunicipalityId, e.target.value);
                }}
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
            placeholder="例: 松山練習会場費など"
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

        {!isEventRequired && (
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
          <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#919191" }}>
            ※ 添付すると審査が通りやすくなります
          </p>
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
