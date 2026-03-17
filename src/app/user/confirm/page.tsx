import { UserConfirmClient } from "@/src/features/users/views/confirm/UserConfirmClient";
import { getUserServer, getSectionsServer, getRolesServer, getInstrumentsServer, getSecretWordsServer, getPrefecturesServer, getMunicipalitiesServer } from "@/src/features/users/api/user-server-actions";
import { Section, Role, Instrument, SecretWord, Prefecture, Municipality } from "@/src/lib/firestore/types";
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
  let sections: Section[] = [];
  let roles: Role[] = [];
  let instruments: Instrument[] = [];
  let secretWords: SecretWord[] = [];
  let prefectures: Prefecture[] = [];
  let municipalities: Municipality[] = [];

  if (uid) {
    [userData, sections, roles, instruments, secretWords, prefectures] = await Promise.all([
      getUserServer(uid),
      getSectionsServer(),
      getRolesServer(),
      getInstrumentsServer(),
      getSecretWordsServer(),
      getPrefecturesServer(),
    ]);

    if (!userData) {
      notFound();
    }

    municipalities = userData.prefectureId 
      ? await getMunicipalitiesServer(userData.prefectureId)
      : [];
  }

  return (
    <UserConfirmClient
      uid={uid}
      userData={userData as any}
      sections={sections}
      roles={roles}
      instruments={instruments}
      secretWords={secretWords}
      prefectures={prefectures}
      municipalities={municipalities}
    />
  );
}
