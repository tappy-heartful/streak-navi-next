import { notFound } from "next/navigation";
import { getNoticeServer } from "@/src/features/notice/api/notice-server-actions";
import { NoticeConfirmClient } from "@/src/features/notice/views/confirm/NoticeConfirmClient";

export const metadata = { title: "カスタム通知確認" };
export const dynamic = "force-dynamic";

export default async function NoticeConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ noticeId?: string }>;
}) {
  const { noticeId } = await searchParams;
  if (!noticeId) notFound();

  const notice = await getNoticeServer(noticeId);
  if (!notice) notFound();

  return <NoticeConfirmClient notice={notice} />;
}
