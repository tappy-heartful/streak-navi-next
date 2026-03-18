import { UserConfirmClient } from "@/src/features/users/views/confirm/UserConfirmClient";
import { getUserServer, getUserLocationServer, getSectionsServer, getRolesServer, getInstrumentsServer, getSecretWordsServer, getPrefecturesServer, getMunicipalitiesServer } from "@/src/features/users/api/user-server-actions";
import { Section, Role, Instrument, SecretWord, Prefecture, Municipality, UserLocation } from "@/src/lib/firestore/types";
import { notFound } from "next/navigation";

type Props = {
  searchParams: Promise<{ uid?: string }>;
};

export async function generateMetadata({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  if (!resolvedParams.uid) return { title: "ユーザ確認" };
  const user = await getUserServer(resolvedParams.uid);
  return {
    title: user?.displayName ? `${user.displayName}` : "ユーザ確認",
  };
}

export const dynamic = "force-dynamic";

export default async function UserConfirmPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const uid = resolvedParams.uid;

  // uidがない場合はClient側でリダイレクトを試みるため、空のデータを渡せるようにする
  let userData = null;
  let userLocation: UserLocation | null = null;
  let sections: Section[] = [];
  let roles: Role[] = [];
  let instruments: Instrument[] = [];
  let secretWords: SecretWord[] = [];
  let prefectures: Prefecture[] = [];
  let municipalities: Municipality[] = [];

  if (uid) {
    [userData, userLocation, sections, roles, instruments, secretWords, prefectures] = await Promise.all([
      getUserServer(uid),
      getUserLocationServer(uid),
      getSectionsServer(),
      getRolesServer(),
      getInstrumentsServer(),
      getSecretWordsServer(),
      getPrefecturesServer(),
    ]);

    if (!userData) {
      notFound();
    }

    municipalities = userLocation?.prefectureId
      ? await getMunicipalitiesServer(userLocation.prefectureId)
      : [];
  }

  return (
    <UserConfirmClient
      uid={uid}
      userData={userData as any}
      userLocation={userLocation}
      sections={sections}
      roles={roles}
      instruments={instruments}
      secretWords={secretWords}
      prefectures={prefectures}
      municipalities={municipalities}
    />
  );
}
