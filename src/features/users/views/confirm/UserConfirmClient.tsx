"use client";

import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { User, Section, Role, Instrument, SecretWord } from "@/src/lib/firestore/types";
import { globalLineDefaultImage, format } from "@/src/lib/functions";
import { useAuth } from "@/src/contexts/AuthContext";

type Props = {
  uid: string;
  userData: User;
  sections: Section[];
  roles: Role[];
  instruments: Instrument[];
  secretWords: SecretWord[];
};

export function UserConfirmClient({ uid, userData, sections, roles, instruments, secretWords }: Props) {
  const { user, isAdmin } = useAuth();

  // マスタデータ名の解決
  const sectionName = sections.find(s => s.id === userData.sectionId)?.name || "未設定";
  const roleName = roles.find(r => r.id === userData.roleId)?.name || "未設定";

  const instrumentNames = (userData.instrumentIds || [])
    .map(id => instruments.find(i => i.id === id)?.name)
    .filter(Boolean)
    .join("、");

  const adminRoles = secretWords
    .filter(sw => userData[sw.roleField])
    .map(sw => sw.label)
    .join("、");

  const isSelf = user?.uid === uid;
  const showEditButtons = isSelf;

  return (
    <BaseLayout>
      <ConfirmLayout
        name="ユーザ"
        basePath="/user"
        dataId={uid}
        featureIdKey="uid"
        collectionName="users"
        overrideAdmin={showEditButtons}
        hideCopy={true} // ユーザのコピー機能は不要
        afterDeletePath="/login"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
          <img
            src={userData.pictureUrl || globalLineDefaultImage}
            alt="icon"
            style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).src = globalLineDefaultImage; }}
          />
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{userData.displayName || "名無し"}</h2>
        </div>

        <DisplayField label="パート">
          {sectionName}
        </DisplayField>

        {userData.sectionId === "1" && (
          <DisplayField label="PayPay ID">
            {userData.paypayId || "未設定"}
          </DisplayField>
        )}

        <DisplayField label="演奏する楽器">
          {instrumentNames || "未設定"}
        </DisplayField>

        <DisplayField label="役職">
          {roleName}
        </DisplayField>

        <DisplayField label="略称(譜割用)">
          {userData.abbreviation || "未設定"}
        </DisplayField>

        <DisplayField label="管理者権限">
          {adminRoles || "なし"}
        </DisplayField>

        <DisplayField label="最終ログイン">
          {userData.lastLoginAt ? format(userData.lastLoginAt, 'yyyy/MM/dd HH:mm') : "記録なし"}
        </DisplayField>

        <DisplayField label="同意日時">
          {userData.agreedAt ? format(userData.agreedAt, 'yyyy/MM/dd HH:mm') : "未承認"}
        </DisplayField>

      </ConfirmLayout>
    </BaseLayout>
  );
}
