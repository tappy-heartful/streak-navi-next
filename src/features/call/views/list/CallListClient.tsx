"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { SimpleTable } from "@/src/components/Table/SimpleTable";
import { Call } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { isInTerm } from "@/src/lib/functions";

type Props = {
  initialData: {
    calls: Call[];
    callAnswerIds: string[];
  };
};

const TABLE_HEADERS = ["募集名", "状況", "回答数", "受付期間", "募集項目"];

type StatusClass = "answered" | "pending" | "closed";

export function CallListClient({ initialData }: Props) {
  const { calls, callAnswerIds } = initialData;
  const { userData } = useAuth();
  const uid = userData?.id;

  // 開始前・受付中・終了に分類
  const { upcoming, active, closed } = useMemo(() => {
    const upcoming: Call[] = [];
    const active: Call[] = [];
    const closed: Call[] = [];
    const now = Date.now();

    calls.forEach(call => {
      const start = call.acceptStartDate ? new Date(call.acceptStartDate.replace(/\./g, "/") + " 00:00:00").getTime() : 0;
      const end = call.acceptEndDate ? new Date(call.acceptEndDate.replace(/\./g, "/") + " 23:59:59").getTime() : Infinity;

      if (now < start) {
        upcoming.push(call);
      } else if (now <= end) {
        active.push(call);
      } else {
        closed.push(call);
      }
    });

    const sortByAnswered = (a: Call, b: Call) => {
      const aAnswered = uid ? callAnswerIds.includes(`${a.id}_${uid}`) : false;
      const bAnswered = uid ? callAnswerIds.includes(`${b.id}_${uid}`) : false;
      if (aAnswered === bAnswered) return 0;
      return aAnswered ? 1 : -1;
    };

    active.sort(sortByAnswered);
    upcoming.sort(sortByAnswered);
    closed.sort(sortByAnswered);

    return { upcoming, active, closed };
  }, [calls, callAnswerIds, uid]);

  const getStatus = (call: Call): { text: string; cls: StatusClass } => {
    const now = Date.now();
    const start = call.acceptStartDate ? new Date(call.acceptStartDate.replace(/\./g, "/") + " 00:00:00").getTime() : 0;
    const end = call.acceptEndDate ? new Date(call.acceptEndDate.replace(/\./g, "/") + " 23:59:59").getTime() : Infinity;

    if (now < start) {
      return { text: "開始前", cls: "closed" }; // 見た目はclosedと同じか適宜調整
    }
    if (now > end) {
      return { text: "終了", cls: "closed" };
    }
    const answered = uid ? callAnswerIds.includes(`${call.id}_${uid}`) : false;
    return answered
      ? { text: "回答済", cls: "answered" }
      : { text: "未回答", cls: "pending" };
  };

  const getCount = (callId: string) =>
    callAnswerIds.filter(id => id.startsWith(callId + "_")).length;

  const renderRow = (call: Call) => {
    const status = getStatus(call);
    const count = getCount(call.id);
    const itemsHtml = (call.items || []).map(i => `・${i}`).join("\n");

    return (
      <tr key={call.id}>
        <td className="list-table-row-header">
          <Link href={`/call/confirm?callId=${call.id}`}>{call.title}</Link>
        </td>
        <td>
          <span className={`answer-status ${status.cls}`}>{status.text}</span>
        </td>
        <td className="count-col">{count}人</td>
        <td className="term-col">
          {call.acceptStartDate} ～<br />{call.acceptEndDate}
        </td>
        <td className="items-col" style={{ whiteSpace: "pre-wrap" }}>
          {itemsHtml || "-"}
        </td>
      </tr>
    );
  };

  return (
    <BaseLayout>
      <ListBaseLayout title="曲募集" icon="fa fa-music" basePath="/call">
        {/* 受付中 */}
        <div className="container" id="active-container">
          <h3>📢 受付中</h3>
          <SimpleTable headers={TABLE_HEADERS} hasData={active.length > 0} emptyMessage="該当する曲募集はありません🍀">
            {active.map(renderRow)}
          </SimpleTable>
        </div>

        {/* 開始前（1件以上ある場合のみ表示） */}
        {upcoming.length > 0 && (
          <div className="container" id="upcoming-container">
            <h3>⏳ 開始前</h3>
            <SimpleTable headers={TABLE_HEADERS} hasData={upcoming.length > 0}>
              {upcoming.map(renderRow)}
            </SimpleTable>
          </div>
        )}

        {/* 終了（1件以上ある場合のみ表示） */}
        {closed.length > 0 && (
          <div className="container" id="closed-container">
            <h3>🏁 終了</h3>
            <SimpleTable headers={TABLE_HEADERS} hasData={closed.length > 0}>
              {closed.map(renderRow)}
            </SimpleTable>
          </div>
        )}
      </ListBaseLayout>
    </BaseLayout>
  );
}
