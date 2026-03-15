import { notFound } from "next/navigation";
import { getNoticeServer } from "@/src/features/notice/api/notice-server-actions";
import { NoticeEditClient } from "@/src/features/notice/views/edit/NoticeEditClient";

export const metadata = { title: "カスタム通知管理" };
export const dynamic = "force-dynamic";

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
