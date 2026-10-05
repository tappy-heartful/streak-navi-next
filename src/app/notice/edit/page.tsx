import { notFound } from "next/navigation";
import { getNoticeServer } from "@/src/features/notice/api/notice-server-actions";
import { NoticeEditClient } from "@/src/features/notice/views/edit/NoticeEditClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; noticeId?: string }>;
}): Promise<Metadata> {
  const { mode = "new", noticeId } = await searchParams;
  if (mode === "new" || !noticeId) {
    return { title: "カスタム通知新規作成" };
  }

  const notice = await getNoticeServer(noticeId);
  const title = notice?.relatedTitle
    ? notice.relatedTitle
    : notice?.schedules?.[0]?.scheduledDate
    ? `${notice.schedules[0].scheduledDate}のカスタム通知`
    : "カスタム通知";
  return {
    title: `${title} - カスタム通知編集`,
  };
}

export default async function NoticeEditPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; noticeId?: string }>;
}) {
  const { mode = "new", noticeId } = await searchParams;

  const initialNotice =
    (mode === "edit" || mode === "copy") && noticeId
      ? await getNoticeServer(noticeId)
      : null;

  if ((mode === "edit" || mode === "copy") && noticeId && !initialNotice) {
    notFound();
  }

  return (
    <NoticeEditClient
      mode={mode as "new" | "edit" | "copy"}
      noticeId={noticeId}
      initialNotice={initialNotice}
    />
  );
}
