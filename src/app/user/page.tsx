import { UserListClient } from "@/src/features/users/views/list/UserListClient";
import { 
  getUsersServer, 
  getSectionsServer, 
  getRolesServer, 
  getInstrumentsServer, 
  getSecretWordsServer, 
  getPrefecturesServer,
  getMunicipalityNamesMapServer
} from "@/src/features/users/api/user-server-actions";

export const metadata = {
  title: "ユーザ一覧",
};

export const dynamic = "force-dynamic";

export default async function UserListPage() {
  const [users, sections, roles, instruments, secretWords, prefectures] = await Promise.all([
    getUsersServer(),
    getSectionsServer(),
    getRolesServer(),
    getInstrumentsServer(),
    getSecretWordsServer(),
    getPrefecturesServer(),
  ]);

  // 全ユーザが使用している市区町村IDを抽出
  const munIds = Array.from(new Set(users.map(u => u.municipalityId).filter(Boolean))) as string[];
  const municipalityNames = await getMunicipalityNamesMapServer(munIds);

  return (
    <UserListClient
      initialData={{
        users, 
        sections, 
        roles, 
        instruments, 
        secretWords, 
        prefectures,
        municipalityNamesMap: municipalityNames
      }}
    />
  );
}
