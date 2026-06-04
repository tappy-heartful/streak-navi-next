import { UserEditClient } from "@/src/features/users/views/edit/UserEditClient";
import { getUserServer, getUserLocationServer, getSectionsServer, getRolesServer, getInstrumentsServer, getPrefecturesServer } from "@/src/features/users/api/user-server-actions";
import { notFound } from "next/navigation";
import { User, Section, Role, Instrument, Prefecture } from "@/src/lib/firestore/types";

type Props = {
  searchParams: Promise<{ uid?: string; [key: string]: string | undefined }>;
};

export async function generateMetadata({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  if (!resolvedParams.uid) return { title: "ユーザ編集" };

  const user = await getUserServer(resolvedParams.uid);
  return {
    title: user?.displayName ? `${user.displayName}の編集` : "ユーザ編集",
  };
}

export const dynamic = "force-dynamic";

export default async function UserEditPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const uid = resolvedParams.uid;

  let userData = null;
  let userLocation = null;
  let sections: Section[] = [];
  let roles: Role[] = [];
  let instruments: Instrument[] = [];
  let prefectures: Prefecture[] = [];

  if (uid) {
    [userData, userLocation, sections, roles, instruments, prefectures] = await Promise.all([
      getUserServer(uid),
      getUserLocationServer(uid),
      getSectionsServer(),
      getRolesServer(),
      getInstrumentsServer(),
      getPrefecturesServer(),
    ]);

    if (!userData) {
      notFound();
    }
  }

  const userToEdit: User = userData || {
    id: uid || "",
    displayName: "",
    pictureUrl: "",
    sectionId: "",
  };

  return (
    <UserEditClient
      key={uid || "initial"}
      uid={uid}
      userData={userToEdit}
      initialLocation={userLocation}
      sections={sections}
      roles={roles}
      instruments={instruments}
      prefectures={prefectures}
      queryParams={resolvedParams as Record<string, string>}
    />
  );
}
