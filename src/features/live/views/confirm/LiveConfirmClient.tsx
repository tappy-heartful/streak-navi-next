"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/src/lib/firebase";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { ConfirmLayout } from "@/src/components/Layout/ConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Live, LiveCheckIn, EnqueteQuestion, EnqueteAnswer, Score } from "@/src/lib/firestore/types";
import { getDayOfWeek, isInTerm } from "@/src/lib/functions";
import { SetlistConfirm } from "@/src/components/Setlist/SetlistConfirm";

type Props = {
  liveData: Live;
  liveId: string;
};

// ===== 動員分析セクション =====

type AnalysisStats = {
  expectedPeople: number;     // 予約総数
  expectedRevenue: number;    // 見込売上
  reserveCheckInPeople: number; // 予約来場者数
  reserveRevenue: number;     // 予約売上実績
  doorCheckInPeople: number;    // 当日来場者数
  doorRevenue: number;        // 当日売上実績
  totalPeople: number;        // 総来場者数
  totalRevenue: number;       // 総売上実績
  checkInRate: number;        // 予約来場率
};

function AnalysisSection({ stats }: { stats: AnalysisStats | null }) {
  if (!stats) return null;
  return (
    <div className="form-group" style={{ marginTop: "2rem" }}>
      <label className="label-title" style={{ fontSize: "1.2em", marginBottom: "1rem" }}>📊 ライブ収支・動員レポート</label>
      
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "16px"
      }}>
        {/* 1. 予約状況（見込） */}
        <div style={{ background: "#f0f7ff", padding: "16px", borderRadius: "12px", border: "1px solid #d1e3ff" }}>
          <div style={{ fontSize: "0.9em", color: "#5a7fad", fontWeight: "bold", marginBottom: "8px" }}>予約状況（見込）</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "1.4em", fontWeight: "bold" }}>{stats.expectedPeople} <small style={{ fontSize: "0.6em" }}>名</small></span>
            <span style={{ fontSize: "1.1em", color: "#456990" }}>¥{stats.expectedRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* 2. 予約来場（実績） */}
        <div style={{ background: "#f0fff4", padding: "16px", borderRadius: "12px", border: "1px solid #c6f6d5" }}>
          <div style={{ fontSize: "0.9em", color: "#2f855a", fontWeight: "bold", marginBottom: "8px" }}>予約来場（実績）</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "1.4em", fontWeight: "bold" }}>{stats.reserveCheckInPeople} <small style={{ fontSize: "0.6em" }}>名</small></span>
            <span style={{ fontSize: "1.1em", color: "#276749" }}>¥{stats.reserveRevenue.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: "0.8em", color: "#38a169", marginTop: "4px" }}>来場率: {stats.checkInRate}%</div>
        </div>

        {/* 3. 当日受付（実績） */}
        <div style={{ background: "#fffaf0", padding: "16px", borderRadius: "12px", border: "1px solid #feebc8" }}>
          <div style={{ fontSize: "0.9em", color: "#c05621", fontWeight: "bold", marginBottom: "8px" }}>当日受付（実績）</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "1.4em", fontWeight: "bold" }}>{stats.doorCheckInPeople} <small style={{ fontSize: "0.6em" }}>名</small></span>
            <span style={{ fontSize: "1.1em", color: "#9c4221" }}>¥{stats.doorRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* 4. 総来場 / 合計売上 */}
        <div style={{ background: "#fff5f5", padding: "16px", borderRadius: "12px", border: "2px solid #feb2b2" }}>
          <div style={{ fontSize: "0.9em", color: "#c53030", fontWeight: "bold", marginBottom: "8px" }}>総括：合計</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "1.6em", fontWeight: "bold", color: "#c53030" }}>{stats.totalPeople} <small style={{ fontSize: "0.6em" }}>名</small></span>
            <span style={{ fontSize: "1.3em", fontWeight: "bold", color: "#c53030" }}>¥{stats.totalRevenue.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== アンケートセクション =====

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rating-bar-row">
      <span className="star-num">{label}</span>
      <div className="bar-bg">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="count-num">{count}</span>
    </div>
  );
}

function EnqueteRating({ q, answers }: { q: EnqueteQuestion; answers: (string | number)[] }) {
  const nums = answers.map(Number).filter((n) => !isNaN(n));
  const avg = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : "0";
  const counts = [0, 0, 0, 0, 0];
  nums.forEach((v) => { if (v >= 1 && v <= 5) counts[v - 1]++; });

  return (
    <div className="enquete-stat-card">
      <div className="stat-header">
        <span className="question-label">{q.label}</span>
        <span className="avg-badge">{avg}</span>
      </div>
      <div className="rating-bar-group">
        {[5, 4, 3, 2, 1].map((n) => (
          <RatingBar key={n} label={`${n}★`} count={counts[n - 1]} total={nums.length} />
        ))}
      </div>
    </div>
  );
}

function EnqueteRadio({ q, answers }: { q: EnqueteQuestion; answers: (string | number)[] }) {
  return (
    <div className="enquete-stat-card">
      <div className="stat-header">
        <span className="question-label">{q.label}</span>
      </div>
      <div className="radio-stats">
        {(q.options || []).map((opt) => {
          const count = answers.filter((a) => a === opt).length;
          const pct = answers.length ? Math.round((count / answers.length) * 100) : 0;
          return (
            <div key={opt} className="radio-row">
              <div className="radio-info">
                <span>{opt}</span>
                <span>{count}票</span>
              </div>
              <div className="bar-bg">
                <div className="bar-fill bar-fill-green" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EnqueteText({ q, answers }: { q: EnqueteQuestion; answers: (string | number)[] }) {
  const texts = answers.filter((a) => String(a).trim() !== "");
  if (texts.length === 0) return null;
  return (
    <div className="text-answer-group">
      <h4>{q.label}</h4>
      {texts.map((a, i) => (
        <div key={i} className="feedback-card" style={{ whiteSpace: "pre-wrap" }}>
          {String(a)}
        </div>
      ))}
    </div>
  );
}

function EnqueteSection({ questions, answers }: { questions: EnqueteQuestion[]; answers: EnqueteAnswer[] }) {
  if (questions.length === 0 || answers.length === 0) return null;
  const allCommon = answers.map((a) => a.common);

  const statsQs = questions.filter((q) => q.type === "rating" || q.type === "radio");
  const textQs = questions.filter((q) => q.type === "text" || q.type === "textarea");

  return (
    <div className="form-group">
      <label className="label-title">📝 アンケート集計 ({answers.length}件)</label>

      {statsQs.length > 0 && (
        <div className="enquete-stats-container">
          {statsQs.map((q) => {
            const vals = allCommon.map((c) => c[q.id]).filter((v) => v !== undefined && v !== "");
            return q.type === "rating"
              ? <EnqueteRating key={q.id} q={q} answers={vals} />
              : <EnqueteRadio key={q.id} q={q} answers={vals} />;
          })}
        </div>
      )}

      {textQs.map((q) => {
        const vals = allCommon.map((c) => c[q.id]).filter((v) => v !== undefined && v !== "");
        return <EnqueteText key={q.id} q={q} answers={vals} />;
      })}
    </div>
  );
}

// ===== メインコンポーネント =====

export function LiveConfirmClient({ liveData, liveId }: Props) {
  const [analysisStats, setAnalysisStats] = useState<AnalysisStats | null>(null);
  const [enqueteQuestions, setEnqueteQuestions] = useState<EnqueteQuestion[]>([]);
  const [enqueteAnswers, setEnqueteAnswers] = useState<EnqueteAnswer[]>([]);
  const [scoresMap, setScoresMap] = useState<Record<string, Score>>({});

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "checkIns"), where("liveId", "==", liveId))
        );
        const all: LiveCheckIn[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LiveCheckIn));
        const doorCount = all.filter((c) => c.type === "door").length;
        const reserveCheckInPeople = all.filter((c) => c.type !== "door").length;
        const totalReserved = liveData.totalReserved ?? 0;
        const checkInRate = totalReserved > 0 ? Math.round((reserveCheckInPeople / totalReserved) * 100) : 0;
        
        const feeAdvance = Number(liveData.feeAdvance || 0);
        const feeDoor = Number(liveData.feeDoor || 0);
        
        const expectedRevenue = totalReserved * feeAdvance;
        const reserveRevenue = reserveCheckInPeople * feeAdvance;
        const doorRevenue = doorCount * feeDoor;
        const totalRevenue = reserveRevenue + doorRevenue;

        setAnalysisStats({
          expectedPeople: totalReserved,
          expectedRevenue,
          reserveCheckInPeople,
          reserveRevenue,
          doorCheckInPeople: doorCount,
          doorRevenue,
          totalPeople: reserveCheckInPeople + doorCount,
          totalRevenue,
          checkInRate,
        });
      } catch (e) {
        console.error("Analysis fetch error:", e);
      }
    };

    const fetchEnquete = async () => {
      try {
        const [qSnap, aSnap] = await Promise.all([
          getDoc(doc(db, "configs", "enqueteQuestions")),
          getDocs(query(collection(db, "enqueteAnswers"), where("liveId", "==", liveId))),
        ]);
        if (!qSnap.exists() || aSnap.empty) return;
        setEnqueteQuestions((qSnap.data().questions as EnqueteQuestion[]) || []);
        setEnqueteAnswers(
          aSnap.docs.map((d) => ({ id: d.id, ...d.data() } as EnqueteAnswer))
        );
      } catch (e) {
        console.error("Enquete fetch error:", e);
      }
    };

    const fetchScores = async () => {
      try {
        const snap = await getDocs(collection(db, "scores"));
        const map: Record<string, Score> = {};
        snap.docs.forEach(d => {
          map[d.id] = { id: d.id, ...d.data() } as Score;
        });
        setScoresMap(map);
      } catch (e) {
        console.error("Scores fetch error:", e);
      }
    };

    fetchAnalysis();
    fetchEnquete();
    fetchScores();
  }, [liveId, liveData.totalReserved, liveData.feeAdvance, liveData.feeDoor]);

  const inTerm = liveData.isAcceptReserve
    ? isInTerm(liveData.acceptStartDate ?? "", liveData.acceptEndDate ?? "")
    : false;

  const formatDate = (dateStr: string) => {
    const day = getDayOfWeek(dateStr, true);
    return `${dateStr} (${day})`;
  };

  const formatPrice = (price?: number | string) => {
    if (price == null || price === "") return "未設定";
    const n = Number(String(price).replace(/,/g, ""));
    return isNaN(n) ? String(price) : `¥${n.toLocaleString()}`;
  };

  return (
    <BaseLayout>
      <ConfirmLayout
        name="ライブ"
        basePath="/live"
        dataId={liveId}
        featureIdKey="liveId"
        collectionName="lives"
        afterDeletePath="/live"
      >
        {liveData.flyerUrl && (
          <div className="form-group" style={{ textAlign: "center" }}>
            <img src={liveData.flyerUrl} alt="フライヤー" style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "8px" }} />
          </div>
        )}

        <DisplayField label="ライブ名">{liveData.title}</DisplayField>

        <DisplayField label="開催日">
          {liveData.date ? formatDate(liveData.date) : "未設定"}
        </DisplayField>

        <DisplayField label="OPEN / START">
          {liveData.open || liveData.start
            ? `OPEN ${liveData.open || "--:--"} / START ${liveData.start || "--:--"}`
            : "未設定"}
        </DisplayField>

        <DisplayField label="会場">
          <span>{liveData.venue || "未設定"}</span>
          {(liveData.venueUrl || liveData.venueGoogleMap) && (
            <span style={{ marginLeft: "12px" }}>
              {liveData.venueUrl && (
                <a href={liveData.venueUrl} target="_blank" rel="noopener noreferrer" style={{ marginRight: "8px" }}>
                  <i className="fas fa-external-link-alt" /> 会場HP
                </a>
              )}
              {liveData.venueGoogleMap && (
                <a href={liveData.venueGoogleMap} target="_blank" rel="noopener noreferrer">
                  <i className="fas fa-map-marker-alt" /> Google Map
                </a>
              )}
            </span>
          )}
        </DisplayField>

        <DisplayField label="料金">
          前売 {formatPrice(liveData.advance)} {liveData.feeAdvance != null && <span style={{ color: "#888", fontSize: "0.9em" }}>(集計: ¥{Number(liveData.feeAdvance).toLocaleString()})</span>} / 
          当日 {formatPrice(liveData.door)} {liveData.feeDoor != null && <span style={{ color: "#888", fontSize: "0.9em" }}>(集計: ¥{Number(liveData.feeDoor).toLocaleString()})</span>}
        </DisplayField>

        <DisplayField label="チケット予約">
          {liveData.isAcceptReserve ? (
            <span>
              予約受付対象
              {inTerm && (
                <span style={{ color: "var(--color-active)", marginLeft: "8px" }}>【受付中】</span>
              )}
            </span>
          ) : "予約不可"}
        </DisplayField>

        {liveData.isAcceptReserve && (
          <>
            <DisplayField label="受付期間">
              {liveData.acceptStartDate && liveData.acceptEndDate
                ? `${liveData.acceptStartDate} ～ ${liveData.acceptEndDate}`
                : "未設定"}
            </DisplayField>

            <DisplayField label="予約済み / 販売総数">
              {liveData.totalReserved ?? 0} / {liveData.ticketStock ?? "未設定"}
            </DisplayField>

            <DisplayField label="最大同伴人数">
              {liveData.maxCompanions != null ? `${liveData.maxCompanions} 名` : "未設定"}
            </DisplayField>
          </>
        )}

        <DisplayField label="備考・ご案内" preWrap>
          {liveData.notes || ""}
        </DisplayField>

        {/* セットリスト */}
        <div className="form-group">
          <SetlistConfirm
            setlist={liveData.setlist || []}
            scoresMap={scoresMap}
          />
        </div>

        {liveData.isAcceptReserve && inTerm && (
          <div className="form-group" style={{ marginTop: "8px" }}>
            <Link href={`/ticket?liveId=${liveId}`} className="btn btn-primary">
              <i className="fas fa-ticket-alt" /> 予約者一覧を見る
            </Link>
          </div>
        )}

        <AnalysisSection stats={analysisStats} />

        <EnqueteSection questions={enqueteQuestions} answers={enqueteAnswers} />
      </ConfirmLayout>
    </BaseLayout>
  );
}
