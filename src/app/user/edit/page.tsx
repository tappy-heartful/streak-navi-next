import { UserEditClient } from "@/src/features/users/views/edit/UserEditClient";
import { getUserServer, getSectionsServer, getRolesServer, getInstrumentsServer, getSecretWordsServer } from "@/src/features/users/api/user-server-actions";
import { notFound } from "next/navigation";
import { User } from "@/src/lib/firestore/types";

type Props = {
  searchParams: Promise<{ uid?: string, mode?: string, isInit?: string }>;
};

export async function generateMetadata({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  if (resolvedParams.isInit === "true") return { title: "ユーザ登録 | streak connect" };
  if (!resolvedParams.uid) return { title: "ユーザ編集 | streak connect" };
  
  const user = await getUserServer(resolvedParams.uid);
  return {
    title: user?.displayName ? `${user.displayName}の編集 | streak connect` : "ユーザ編集 | streak connect",
  };
}

export default async function UserEditPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  if (!resolvedParams.uid) {
    notFound();
  }

  const isInit = resolvedParams.isInit === "true";
  const mode = isInit ? "new" : "edit";

  const [userData, sections, roles, instruments, secretWords] = await Promise.all([
    getUserServer(resolvedParams.uid),
    getSectionsServer(),
    getRolesServer(),
    getInstrumentsServer(),
    getSecretWordsServer(),
  ]);

  // 新規登録の場合、DBにまだレコードがなくてもFirebase Auth由来のセッションからuidが得られる前提。
  // まだusersコレクションに存在しない場合は空のUserオブジェクトを渡す
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
      secretWords={secretWords}
      mode={mode as "new" | "edit"}
    />
  );
}
