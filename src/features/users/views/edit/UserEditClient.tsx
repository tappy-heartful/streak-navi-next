"use client";

import { useAppForm } from "@/src/hooks/useAppForm";
import { User, UserLocation, Section, Role, Instrument, Prefecture, Municipality } from "@/src/lib/firestore/types";
import { AppInput } from "@/src/components/Form/AppInput";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { saveUser, getMunicipalitiesClient } from "@/src/features/users/api/user-client-service";
import { InstrumentInput } from "@/src/features/users/components/InstrumentInput";
import { FormField } from "@/src/components/Form/FormField";
import { globalLineDefaultImage } from "@/src/lib/functions";
import { useAuth } from "@/src/contexts/AuthContext";
import { useState, useEffect } from "react";

type Props = {
  uid: string;
  userData: User;
  initialLocation?: UserLocation | null;
  sections: Section[];
  roles: Role[];
  instruments: Instrument[];
  prefectures: Prefecture[];
};

type UserFormData = {
  sectionId: string;
  roleId: string;
  abbreviation: string;
  instrumentIds: string[];
  paypayId: string;
  prefectureId: string;
  municipalityId: string;
};

export function UserEditClient({ uid, userData, initialLocation, sections, roles, instruments, prefectures }: Props) {
  const { user, refreshUserData } = useAuth();
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loadingMun, setLoadingMun] = useState(false);

  const isSelf = user?.uid === uid;
  const canEdit = isSelf;

  const initialValues: UserFormData = {
    sectionId: userData.sectionId || "",
    roleId: userData.roleId || "",
    abbreviation: userData.abbreviation || "",
    instrumentIds: userData.instrumentIds || [],
    paypayId: userData.paypayId || "",
    prefectureId: initialLocation?.prefectureId || "",
    municipalityId: initialLocation?.municipalityId || "",
  };

  const form = useAppForm<UserFormData>(initialValues, {
    sectionId: [(v) => v ? true : "パートを選択してください"],
    roleId: [(v) => v ? true : "役職を選択してください"],
    abbreviation: [
      (v) => v ? true : "略称を入力してください",
      (v) => v.length <= 2 ? true : "略称は2文字以下で入力してください"
    ],
    instrumentIds: [(v) => v && v.length > 0 ? true : "演奏する楽器を一つ以上選択してください"],
    paypayId: [(v) => {
      if (form.formData.sectionId === "1" && !v) {
        return "PayPay IDを入力してください（サックスパート必須）";
      }
      return true;
    }],
  });

  // 都道府県が変更されたら市区町村をロード
  useEffect(() => {
    const loadMun = async () => {
      if (!form.formData.prefectureId) {
        setMunicipalities([]);
        // 県が空になったら市区町村もクリア
        if (form.formData.municipalityId) {
          form.updateField("municipalityId", "");
        }
        return;
      }

      setLoadingMun(true);
      try {
        const data = await getMunicipalitiesClient(form.formData.prefectureId);
        setMunicipalities(data);

        // 現在の市区町村が、新しく取得したリストに含まれていない場合はクリア
        if (form.formData.municipalityId && !data.some(m => m.id === form.formData.municipalityId)) {
          form.updateField("municipalityId", "");
        }
      } catch (e) {
        console.error("Failed to load municipalities:", e);
      } finally {
        setLoadingMun(false);
      }
    };
    loadMun();
  }, [form.formData.prefectureId]);

  const handleSave = async (data: UserFormData) => {
    await saveUser(uid, data);
    // 自身のデータなら、グローバルのAuthContextを最新化する
    if (isSelf) {
      await refreshUserData();
    }
    return uid;
  };

  return (
    <EditFormLayout
      featureName="ユーザ"
      icon="fa-solid fa-users"
      featureIdKey="uid"
      basePath="/user"
      dataId={uid}
      mode="edit"
      form={form}
      onSaveApi={handleSave}
      overrideAdmin={canEdit}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <img
          src={userData.pictureUrl || globalLineDefaultImage}
          alt="icon"
          style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover" }}
          onError={(e) => { (e.target as HTMLImageElement).src = globalLineDefaultImage; }}
        />
        <h2 style={{ margin: 0 }}>{userData.displayName || "名無し"}</h2>
      </div>

      <FormField label="パート" required error={form.errors.sectionId}>
        <select
          className="form-control"
          value={form.formData.sectionId}
          onChange={(e) => form.updateField("sectionId", e.target.value)}
        >
          <option value="">--- 選択してください ---</option>
          {sections.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="musical-hint">所属パートを選択してください</div>
      </FormField>

      {form.formData.sectionId === "1" && (
        <AppInput
          label="PayPay ID"
          field="paypayId"
          value={form.formData.paypayId}
          updateField={form.updateField}
          error={form.errors.paypayId}
          required={true}
          placeholder="PayPay IDを入力してください"
        />
      )}

      <FormField label="演奏する楽器 (譜割用 複数選択可)" required error={form.errors.instrumentIds}>
        <InstrumentInput
          selectedSectionId={form.formData.sectionId}
          selectedInstrumentIds={form.formData.instrumentIds}
          allInstruments={instruments}
          onChange={(ids) => form.updateField("instrumentIds", ids)}
        />
        <div className="musical-hint">持ち替え楽器（フルートやクラリネット等）も忘れずにチェック！</div>
      </FormField>

      <FormField label="役職" required error={form.errors.roleId}>
        <select
          className="form-control"
          value={form.formData.roleId}
          onChange={(e) => form.updateField("roleId", e.target.value)}
        >
          <option value="">--- 選択してください ---</option>
          {roles.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </FormField>

      <AppInput
        label="略称(譜割用)"
        field="abbreviation"
        value={form.formData.abbreviation}
        updateField={form.updateField}
        required
        error={form.errors.abbreviation}
        placeholder="例: 太郎"
      />
      <div className="musical-hint" style={{ marginTop: '-12px', marginBottom: '16px' }}>
        譜割りに表示されるあなたの名前です（2文字）
      </div>

      <hr style={{ margin: "2rem 0", border: "0", borderTop: "1px solid #eee" }} />
      <h3 style={{ marginBottom: "0.5rem" }}>居住地情報（本人以外には非表示・任意）</h3>
      <p style={{ fontSize: "0.85rem", color: "#666" }}>
        ※ 旅費補助制度の事前調査と、各ユーザのスムーズな経費申請のため、旅費補助を受けたい方はご協力おねがいします。
      </p>
      <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1.5rem" }}>
        ※ 情報はセキュリティで保護され、本人以外には表示されません。
      </p>

      <FormField label="居住県" error={form.errors.prefectureId}>
        <select
          className="form-control"
          value={form.formData.prefectureId}
          onChange={(e) => form.updateField("prefectureId", e.target.value)}
        >
          <option value="">--- 選択してください ---</option>
          {prefectures.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </FormField>

      <FormField label="市区町村" error={form.errors.municipalityId}>
        <select
          className="form-control"
          value={form.formData.municipalityId}
          onChange={(e) => form.updateField("municipalityId", e.target.value)}
          disabled={!form.formData.prefectureId || loadingMun}
        >
          <option value="">{loadingMun ? "読み込み中..." : "--- 選択してください ---"}</option>
          {municipalities.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </FormField>

    </EditFormLayout>
  );
}
