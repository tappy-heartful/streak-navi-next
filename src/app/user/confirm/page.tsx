import { UserConfirmClient } from "@/src/features/users/views/confirm/UserConfirmClient";
import { getUserServer, getSectionsServer, getRolesServer, getInstrumentsServer, getSecretWordsServer, getPrefecturesServer, getMunicipalitiesServer } from "@/src/features/users/api/user-server-actions";
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
  if (!resolvedParams.uid) {
    notFound();
  }

  const [userData, sections, roles, instruments, secretWords, prefectures] = await Promise.all([
    getUserServer(resolvedParams.uid),
    getSectionsServer(),
    getRolesServer(),
    getInstrumentsServer(),
    getSecretWordsServer(),
    getPrefecturesServer(),
  ]);

  if (!userData) {
    notFound();
  }

  const municipalities = userData.prefectureId 
    ? await getMunicipalitiesServer(userData.prefectureId)
    : [];

  return (
    <UserConfirmClient
      uid={resolvedParams.uid}
      userData={userData}
      sections={sections}
      roles={roles}
      instruments={instruments}
      secretWords={secretWords}
      prefectures={prefectures}
      municipalities={municipalities}
    />
  );
}
