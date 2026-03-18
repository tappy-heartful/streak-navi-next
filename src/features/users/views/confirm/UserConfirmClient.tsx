"use client";

import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { User, UserLocation, Section, Role, Instrument, SecretWord, Prefecture, Municipality } from "@/src/lib/firestore/types";
import { globalLineDefaultImage, format } from "@/src/lib/functions";
import { useAuth } from "@/src/contexts/AuthContext";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type Props = {
  uid?: string;
  userData: User;
  userLocation?: UserLocation | null;
  sections: Section[];
  roles: Role[];
  instruments: Instrument[];
  secretWords: SecretWord[];
  prefectures: Prefecture[];
  municipalities: Municipality[];
};

export function UserConfirmClient({ uid, userData, userLocation, sections, roles, instruments, secretWords, prefectures, municipalities }: Props) {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!uid && user?.uid) {
      router.replace(`/user/confirm?uid=${user.uid}`);
    }
  }, [uid, user, router]);

  if (!uid) return null;

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

  const prefectureName = prefectures.find(p => p.id === userLocation?.prefectureId)?.name || "未設定";
  const municipalityName = municipalities.find(m => m.id === userLocation?.municipalityId)?.name || "未設定";

  const maskedPrefecture = isSelf ? prefectureName : prefectureName === "未設定" ? "未設定" : "***";
  const maskedMunicipality = isSelf ? municipalityName : municipalityName === "未設定" ? "未設定" : "***";

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

        <hr style={{ margin: "2rem 0", border: "0", borderTop: "1px solid #eee" }} />

        <DisplayField label="居住県">
          {maskedPrefecture}
        </DisplayField>

        <DisplayField label="市区町村">
          {maskedMunicipality}
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
