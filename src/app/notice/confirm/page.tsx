import { notFound } from "next/navigation";
import { getNoticeServer } from "@/src/features/notice/api/notice-server-actions";
import { NoticeConfirmClient } from "@/src/features/notice/views/confirm/NoticeConfirmClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ noticeId?: string }>;
}): Promise<Metadata> {
  const { noticeId } = await searchParams;
  if (!noticeId) return { title: "通知設定詳細" };

  const notice = await getNoticeServer(noticeId);
  const title = notice?.relatedTitle
    ? notice.relatedTitle
    : notice?.schedules?.[0]?.scheduledDate
    ? `${notice.schedules[0].scheduledDate}のカスタム通知`
    : "カスタム通知";
  return {
    title: `${title} - 通知設定詳細`,
  };
}

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
