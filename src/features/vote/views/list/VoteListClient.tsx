"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Vote } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { isInTerm } from "@/src/lib/functions";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { db } from "@/src/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

type Props = {
  votes: Vote[];
  participantCountMap: Record<string, number>;
};

export function VoteListClient({ votes, participantCountMap }: Props) {
  const { isAdmin, userData } = useAuth();
  const uid = userData?.id;

  const [answeredVoteIds, setAnsweredVoteIds] = useState<Record<string, boolean>>({});

  const activeList = votes.filter((v) => isInTerm(v.acceptStartDate, v.acceptEndDate));
  const closedList = votes.filter((v) => !isInTerm(v.acceptStartDate, v.acceptEndDate));

  useEffect(() => {
    if (!uid) return;
    const fetchAnswers = async () => {
      try {
        const q = query(
          collection(db, "voteAnswers"),
          where("uid", "==", uid)
        );
        const snap = await getDocs(q);
        const results: Record<string, boolean> = {};
        snap.forEach(doc => {
          results[doc.data().voteId] = true;
        });
        setAnsweredVoteIds(results);
      } catch (e) {
        console.error("Failed to fetch vote answers", e);
      }
    };
    fetchAnswers();
  }, [uid]);

  return (
    <BaseLayout>
      <ListBaseLayout
        title="投票"
        icon="fas fa-vote-yea" // optional
        basePath="/vote"
        hideAddButton={!isAdmin}
      >
        <div className="container" id="active-container">
          <h3>📢 受付中</h3>
          <div className="table-wrapper">
            <table className="list-table">
              <thead>
                <tr>
                  <th>投票名</th>
                  <th>状況</th>
                  <th>回答数</th>
                  <th>受付期間</th>
                  <th>投票項目</th>
                </tr>
              </thead>
              <tbody id="active-list-body">
                {activeList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-text">該当する投票はありません🍀</td>
                  </tr>
                ) : (
                  activeList.map((vote) => {
                    const hasAnswered = answeredVoteIds[vote.id] || false;
                    const statusText = hasAnswered ? "回答済" : "未回答";
                    const statusClass = hasAnswered ? "answered" : "pending";
                    const participantCount = participantCountMap[vote.id] || 0;

                    return (
                      <tr key={vote.id}>
                        <td className="list-table-row-header">
                          <Link href={`/vote/confirm?voteId=${vote.id}`}>{vote.name}</Link>
                        </td>
                        <td>
                          <span className={`answer-status ${statusClass}`}>{statusText}</span>
                        </td>
                        <td className="count-col">{participantCount}人</td>
                        <td className="term-col">
                          {vote.acceptStartDate} ～ <br/> {vote.acceptEndDate}
                        </td>
                        <td className="items-col">
                          {vote.items.length === 0 ? "-" : vote.items.map((i, idx) => (
                            <React.Fragment key={idx}>
                              ・{i.name}
                              {idx < vote.items.length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {closedList.length > 0 && (
          <div className="container" id="closed-container">
            <h3>🏁 期間外</h3>
            <div className="table-wrapper">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>投票名</th>
                    <th>状況</th>
                    <th>回答数</th>
                    <th>受付期間</th>
                    <th>投票項目</th>
                  </tr>
                </thead>
                <tbody id="closed-list-body">
                  {closedList.map((vote) => {
                    const participantCount = participantCountMap[vote.id] || 0;

                    return (
                      <tr key={vote.id}>
                        <td className="list-table-row-header">
                          <Link href={`/vote/confirm?voteId=${vote.id}`}>{vote.name}</Link>
                        </td>
                        <td>
                          <span className="answer-status closed">期間外</span>
                        </td>
                        <td className="count-col">{participantCount}人</td>
                        <td className="term-col">
                          {vote.acceptStartDate} ～ <br/> {vote.acceptEndDate}
                        </td>
                        <td className="items-col">
                          {vote.items.length === 0 ? "-" : vote.items.map((i, idx) => (
                            <React.Fragment key={idx}>
                              ・{i.name}
                              {idx < vote.items.length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ListBaseLayout>
    </BaseLayout>
  );
}
