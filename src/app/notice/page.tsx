import { getNoticesServer } from "@/src/features/notice/api/notice-server-actions";
import { NoticeListClient } from "@/src/features/notice/views/list/NoticeListClient";

export const metadata = { title: "通知設定一覧" };
export const dynamic = "force-dynamic";

export default async function NoticeListPage() {
  const notices = await getNoticesServer();
  return <NoticeListClient initialNotices={notices} />;
}
