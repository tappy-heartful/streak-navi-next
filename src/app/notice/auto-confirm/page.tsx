import { getNoticeBaseServer } from "@/src/features/notice/api/notice-server-actions";
import { NoticeAutoConfirmClient } from "@/src/features/notice/views/auto-confirm/NoticeAutoConfirmClient";

export const metadata = { title: "自動通知設定確認" };
export const dynamic = "force-dynamic";

export default async function NoticeAutoConfirmPage() {
  const noticeBase = await getNoticeBaseServer();
  return <NoticeAutoConfirmClient noticeBase={noticeBase} />;
}
