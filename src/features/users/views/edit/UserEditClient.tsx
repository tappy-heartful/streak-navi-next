"use client";

import { useAppForm } from "@/src/hooks/useAppForm";
import { User, Section, Role, Instrument, SecretWord } from "@/src/lib/firestore/types";
import { AppInput } from "@/src/components/Form/AppInput";
import { EditFormLayout } from "@/src/components/Layout/EditFormLayout";
import { saveUser } from "@/src/features/users/api/user-client-service";
import { InstrumentInput } from "@/src/features/users/components/InstrumentInput";
import { FormField } from "@/src/components/Form/FormField";
import { globalLineDefaultImage, setSession } from "@/src/lib/functions";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";

type Props = {
  uid: string;
  userData: User;
  sections: Section[];
  roles: Role[];
  instruments: Instrument[];
  secretWords: SecretWord[];
  mode: "new" | "edit";
};

type UserFormData = {
  sectionId: string;
  roleId: string;
  abbreviation: string;
  instrumentIds: string[];
  paypayId: string;
  [key: string]: any; // isAdminフラグのため
};

export function UserEditClient({ uid, userData, sections, roles, instruments, secretWords, mode }: Props) {
  const { user, isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const isInit = searchParams.get("isInit") === "true";

  const isSelf = user?.uid === uid;
  const canEdit = isSelf;

  // Formの初期値マッピング
  const initialValues: UserFormData = {
    sectionId: userData.sectionId || "",
    roleId: userData.roleId || "",
    abbreviation: userData.abbreviation || "",
    instrumentIds: userData.instrumentIds || [],
    paypayId: userData.paypayId || "",
  };

  // 管理者権限を初期値にマージ
  secretWords.forEach(sw => {
    initialValues[sw.roleField] = userData[sw.roleField] || false;
  });

  const form = useAppForm<UserFormData>(initialValues, {
    sectionId: [(v) => v ? true : "パートを選択してください"],
    roleId: [(v) => v ? true : "役職を選択してください"],
    abbreviation: [
      (v) => v ? true : "略称を入力してください",
      (v) => v.length <= 2 ? true : "略称は2文字以下で入力してください"
    ],
    instrumentIds: [(v) => v && v.length > 0 ? true : "演奏する楽器を一つ以上選択してください"],
    // サックスパートの場合はPayPayID必須
    paypayId: [(v) => {
      if (form.formData.sectionId === "1" && !v) {
        return "PayPay IDを入力してください（サックスパート必須）";
      }
      return true;
    }],
  });

  const handleSave = async (data: UserFormData) => {
    await saveUser(uid, data);

    // 初回登録時の特殊処理（バニラ実装のリダイレクトに相当）
    if (isInit) {
      // isInit状態をセッションに保持
      setSession("isInit", "true");
      // 実際のリダイレクト処理は EditFormLayout の後続処理に任せるか、
      // 呼び出し元で制御するべきですが、ここでは onSuccess などのコールバックがないため、
      // 便宜上リターンで id を返します。
    }
    return uid;
  };

  return (
    <EditFormLayout
      featureName={isInit ? "ユーザ登録" : "ユーザ"}
      featureIdKey="uid"
      basePath="/user"
      dataId={uid}
      mode={mode}
      form={form}
      onSaveApi={handleSave}
      overrideAdmin={canEdit}
    >
      {isInit && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#fff3cd", color: "#856404", borderRadius: "8px" }}>
          ユーザを登録してください
        </div>
      )}

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
          onChange={(e) => {
            form.updateField("sectionId", e.target.value);
            // パート変更時にPayPayIDのエラーをクリアしたいが、簡便のためそのまま
          }}
        >
          <option value="">--- 選択してください ---</option>
          {sections.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </FormField>

      {form.formData.sectionId === "1" && (
        <AppInput
          label="PayPay ID"
          field="paypayId"
          value={form.formData.paypayId}
          updateField={form.updateField}
          error={form.errors.paypayId}
          required={true}
        />
      )}

      <FormField label="演奏する楽器 (譜割用 複数選択可)" required error={form.errors.instrumentIds as unknown as string}>
        <InstrumentInput
          selectedSectionId={form.formData.sectionId}
          selectedInstrumentIds={form.formData.instrumentIds}
          allInstruments={instruments}
          onChange={(ids) => form.updateField("instrumentIds", ids)}
        />
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
      />

    </EditFormLayout>
  );
}
