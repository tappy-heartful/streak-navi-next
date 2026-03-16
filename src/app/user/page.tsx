import { UserListClient } from "@/src/features/users/views/list/UserListClient";
import { getUsersServer, getSectionsServer, getRolesServer, getInstrumentsServer, getSecretWordsServer } from "@/src/features/users/api/user-server-actions";

export const metadata = {
  title: "ユーザ一覧",
};

export const dynamic = "force-dynamic";

export default async function UserListPage() {
  const [users, sections, roles, instruments, secretWords] = await Promise.all([
    getUsersServer(),
    getSectionsServer(),
    getRolesServer(),
    getInstrumentsServer(),
    getSecretWordsServer(),
  ]);

  return (
    <UserListClient
      initialData={{
        users, sections, roles, instruments, secretWords
      }}
    />
  );
}
