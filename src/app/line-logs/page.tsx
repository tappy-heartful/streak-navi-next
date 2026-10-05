import { Metadata } from "next";
import LineLogListClient from "@/src/features/line-logs/views/LineLogListClient";

export const metadata: Metadata = {
  title: "LINE送信履歴",
  description: "LINE公式アカウントのメッセージ送信履歴および配信可能枠の消費状況",
};

export default function LineLogsPage() {
  return <LineLogListClient />;
}
