import { getNoticeBaseServer } from "@/src/features/notice/api/notice-server-actions";
import { NoticeAutoEditClient } from "@/src/features/notice/views/auto-edit/NoticeAutoEditClient";

export const metadata = { title: "自動通知設定編集" };
export const dynamic = "force-dynamic";

export default async function NoticeAutoEditPage() {
  const noticeBase = await getNoticeBaseServer();
  return <NoticeAutoEditClient initialNoticeBase={noticeBase} />;
}
