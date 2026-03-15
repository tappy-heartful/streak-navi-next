import { UserEditClient } from "@/src/features/users/views/edit/UserEditClient";
import { getUserServer, getSectionsServer, getRolesServer, getInstrumentsServer } from "@/src/features/users/api/user-server-actions";
import { notFound } from "next/navigation";
import { User } from "@/src/lib/firestore/types";

type Props = {
  searchParams: Promise<{ uid?: string }>;
};

export async function generateMetadata({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  if (!resolvedParams.uid) return { title: "ユーザ編集" };

  const user = await getUserServer(resolvedParams.uid);
  return {
    title: user?.displayName ? `${user.displayName}の編集` : "ユーザ編集",
  };
}

export default async function UserEditPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  if (!resolvedParams.uid) {
    notFound();
  }

  const [userData, sections, roles, instruments] = await Promise.all([
    getUserServer(resolvedParams.uid),
    getSectionsServer(),
    getRolesServer(),
    getInstrumentsServer(),
  ]);

  const userToEdit: User = userData || {
    id: resolvedParams.uid,
    displayName: "",
    pictureUrl: "",
    sectionId: "",
  };

  return (
    <UserEditClient
      uid={resolvedParams.uid}
      userData={userToEdit}
      sections={sections}
      roles={roles}
      instruments={instruments}
    />
  );
}
