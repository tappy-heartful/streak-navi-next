"use client";

import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { Live, Ticket, LiveCheckIn } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { showDialog, showSpinner, hideSpinner, format } from "@/src/lib/functions";
import {
  fetchTickets,
  fetchCheckIns,
  fetchCheckInsByTicketId,
  addCheckIn,
  deleteCheckIn,
  addDoorCheckIn,
  deleteDoorCheckIn,
} from "@/src/features/ticket/api/ticket-client-service";
import { writeLog } from "@/src/lib/functions";

// =====================================================================
// 型定義
// =====================================================================

type CheckInMap = Record<string, string>; // name -> checkIn docId

// =====================================================================
// チェックインモーダル
// =====================================================================

type CheckInTarget = { name: string; type: string };

type CheckInModalState = {
  ticket: Ticket;
  live: Live | undefined;
  groupSuffix: string | null;
  displayNo: string;
  targets: CheckInTarget[];
  currentCheckedMap: CheckInMap;
};

function CheckInModal({
  state,
  onClose,
  onSave,
}: {
  state: CheckInModalState;
  onClose: () => void;
  onSave: (checked: Set<string>, unchecked: Set<string>) => Promise<void>;
}) {
  const [checkedNames, setCheckedNames] = useState<Set<string>>(
    () => new Set(Object.keys(state.currentCheckedMap))
  );
  const [saving, setSaving] = useState(false);

  const toggle = (name: string) => {
    setCheckedNames((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const toAdd = new Set<string>();
    const toRemove = new Set<string>();
    state.targets.forEach((t) => {
      const wasChecked = !!state.currentCheckedMap[t.name];
      const isNowChecked = checkedNames.has(t.name);
      if (isNowChecked && !wasChecked) toAdd.add(t.name);
      else if (!isNowChecked && wasChecked) toRemove.add(t.name);
    });
    await onSave(toAdd, toRemove);
    setSaving(false);
  };

  const isInvite = state.ticket.resType === "invite";
  const unitPrice = (state.live?.feeAdvance ?? 0);
  
  // 表示されている対象者のみをカウントして計算する
  const targetNames = new Set(state.targets.map(t => t.name));
  const visibleCheckedCount = Array.from(checkedNames).filter(name => targetNames.has(name)).length;
  const totalPrice = visibleCheckedCount * unitPrice;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>チェックイン確認</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {isInvite && (
            <div className="invite-info-header" style={{ marginBottom: "12px", padding: "8px", background: "#f9f0ff", borderRadius: "6px" }}>
              <div style={{ fontWeight: "bold" }}>{state.ticket.representativeName} 様のご招待</div>
              {state.groupSuffix && state.ticket.groups && (
                <div style={{ fontSize: "0.85em", color: "#666" }}>
                  {state.ticket.groups[parseInt(state.groupSuffix) - 1]?.groupName} のみなさま
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "12px" }}>
            <span style={{ fontSize: "1.2em", fontWeight: "bold", color: "#e91e63" }}>
              {visibleCheckedCount} 名 / ¥{totalPrice.toLocaleString()}
            </span>
            <span style={{ fontSize: "0.85em", color: "#888" }}>
              予約番号: {state.displayNo}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {state.targets.map((target, i) => {
              const isChecked = checkedNames.has(target.name);
              return (
                <label
                  key={i}
                  className={`checkin-item${isChecked ? " is-checked" : ""}`}
                  style={{
                    display: "flex", alignItems: "center", padding: "10px 12px",
                    border: `2px solid ${isChecked ? "#28a745" : "#ddd"}`,
                    borderRadius: "8px", cursor: "pointer",
                    background: isChecked ? "#f0fff4" : "#fff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(target.name)}
                    style={{ width: "22px", height: "22px", marginRight: "12px" }}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: "bold" }}>{target.name} 様</span>
                    <span style={{ fontSize: "0.8em", color: "#888", marginLeft: "8px" }}>{target.type}</span>
                  </div>
                  {isChecked && <span style={{ color: "#28a745", fontSize: "0.85em" }}>✅ 済み</span>}
                </label>
              );
            })}
          </div>
        </div>
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose} disabled={saving}>閉じる</button>
          <button className="save-button" onClick={handleSave} disabled={saving}>
            {saving ? "更新中..." : "決定"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// 当日受付モーダル
// =====================================================================

function DoorCheckInModal({
  onClose,
  onSave,
  feeDoor,
}: {
  onClose: () => void;
  onSave: (count: number) => Promise<void>;
  feeDoor: number;
}) {
  const [count, setCount] = useState(1);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (count <= 0) return;
    setSaving(true);
    await onSave(count);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "340px" }}>
        <div className="modal-header">
          <h3>当日受付チェックイン</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: "12px" }}>当日受付の人数を入力してください。</p>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#4caf50" }}>
              ¥{ (count * feeDoor).toLocaleString() }
            </span>
            <div style={{ fontSize: "0.85em", color: "#888" }}>({count}名分)</div>
          </div>
          <input
            type="number"
            className="form-control"
            value={count}
            min={1}
            onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ fontSize: "1.2em", textAlign: "center" }}
          />
        </div>
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose} disabled={saving}>キャンセル</button>
          <button className="save-button" onClick={handleSave} disabled={saving}
            style={{ background: "#4caf50" }}>
            {saving ? "登録中..." : "登録"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// QRスキャナーモーダル
// =====================================================================

function QrScannerModal({
  onDetected,
  onClose,
}: {
  onDetected: (data: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        const jsQR = (await import("jsqr")).default;

        const scan = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.paused || video.ended) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
              stopCamera();
              onDetected(code.data);
              return;
            }
          }
          animRef.current = requestAnimationFrame(scan);
        };
        animRef.current = requestAnimationFrame(scan);
      } catch {
        showDialog("カメラの起動に失敗しました", true);
        onClose();
      }
    };

    startCamera();
    return () => {
      active = false;
      stopCamera();
    };
  }, [onDetected, onClose, stopCamera]);

  const handleClose = () => { stopCamera(); onClose(); };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
        <div className="modal-header">
          <h3>QRスキャン</h3>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ position: "relative", background: "#000", borderRadius: "8px", overflow: "hidden" }}>
            <video ref={videoRef} playsInline style={{ width: "100%", display: "block" }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
          <p style={{ textAlign: "center", marginTop: "10px", fontSize: "0.8em", color: "#666" }}>
            QRコードを枠内に写してください
          </p>
        </div>
        <div className="modal-footer">
          <button className="cancel-button" onClick={handleClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// メインコンポーネント
// =====================================================================

type Props = {
  initialLives: Live[];
  initialLiveId?: string;
};

export function TicketListClient({ initialLives, initialLiveId }: Props) {
  const { isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  // --- データ状態 ---
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [checkIns, setCheckIns] = useState<LiveCheckIn[]>([]);
  const [loading, setLoading] = useState(false);

  // --- フィルター状態 ---
  const [selectedLiveId, setSelectedLiveId] = useState<string>(initialLiveId ?? "");
  const [searchResNo, setSearchResNo] = useState("");
  const [searchName, setSearchName] = useState("");
  const [appliedResNo, setAppliedResNo] = useState("");
  const [appliedName, setAppliedName] = useState("");

  // --- モーダル状態 ---
  const [checkInModalState, setCheckInModalState] = useState<CheckInModalState | null>(null);
  const [doorModalOpen, setDoorModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const checkLiveSelected = useCallback(async () => {
    if (!selectedLiveId) {
      await showDialog("ライブを選択してください", true);
      return false;
    }
    return true;
  }, [selectedLiveId]);

  useEffect(() => {
    setBreadcrumbs([{ title: "予約者一覧" }]);
    
    // ライブ未選択（且つURL指定なし）の場合のみ、直近のライブを自動選択
    if (!initialLiveId) {
      const today = format(new Date(), "yyyy.MM.dd");
      const closest = [...initialLives]
        .filter((l) => l.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      const targetId = closest?.id ?? (initialLives[0]?.id ?? "");
      if (targetId) setSelectedLiveId(targetId);
    }
  }, [setBreadcrumbs, initialLiveId, initialLives]);

  // --- データ取得 ---
  const loadData = useCallback(async () => {
    if (!selectedLiveId) { setTickets([]); setCheckIns([]); return; }
    setLoading(true);
    try {
      const [t, c] = await Promise.all([fetchTickets(selectedLiveId), fetchCheckIns(selectedLiveId)]);
      setTickets(t);
      setCheckIns(c);
    } catch (e) {
      console.error(e);
      await writeLog({ dataId: selectedLiveId, action: "予約者一覧データ取得", status: "error", errorDetail: { message: (e as Error).message } });
    } finally {
      setLoading(false);
    }
  }, [selectedLiveId]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- フィルター済みデータ ---
  const checkedNameSet = new Set<string>(
    checkIns.map((c) => c.name).filter((n): n is string => !!n)
  );

  const filteredTickets = tickets.filter((t) => {
    const matchLive = !selectedLiveId || t.liveId === selectedLiveId;
    const matchResNo = !appliedResNo || (t.reservationNo?.includes(appliedResNo) ?? false);
    const matchName = !appliedName ||
      (t.representativeName?.toLowerCase().includes(appliedName.toLowerCase()) ?? false);
    return matchLive && matchResNo && matchName;
  });

  const doorCheckIns = checkIns.filter((c) => c.type === "door" && (!selectedLiveId || c.liveId === selectedLiveId));

  // --- チェックインモーダルを開く ---
  const openCheckInModal = async (fullId: string) => {
    showSpinner();
    let ticketId = fullId;
    let groupSuffix: string | null = null;
    try {
      const gIndex = fullId.lastIndexOf("_g");
      const underscoreCount = (fullId.match(/_/g) || []).length;

      if (underscoreCount >= 2 && gIndex !== -1) {
        ticketId = fullId.substring(0, gIndex);
        groupSuffix = fullId.substring(gIndex + 2);
      }

      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket) throw new Error("Ticket not found");

      const currentCheckIns = await fetchCheckInsByTicketId(ticket.id);
      const currentCheckedMap: CheckInMap = {};
      currentCheckIns.forEach((c) => {
        if (c.name) currentCheckedMap[c.name] = c.id;
      });

      let targets: CheckInTarget[] = [];
      let displayNo = ticket.reservationNo;

      if (groupSuffix && ticket.groups) {
        const gIdx = parseInt(groupSuffix) - 1;
        const group = ticket.groups[gIdx];
        if (group) {
          displayNo = `${ticket.reservationNo}-${groupSuffix}`;
          targets = group.companions
            .filter((c) => c !== "")
            .map((name) => ({ name, type: group.groupName }));
        }
      } else if (ticket.resType === "invite" && ticket.groups) {
        ticket.groups.forEach((g) => {
          g.companions
            .filter((c) => c !== "")
            .forEach((name) => targets.push({ name, type: g.groupName }));
        });
      } else {
        if (ticket.representativeName) {
          targets.push({ name: ticket.representativeName, type: "代表者" });
        }
        (ticket.companions || [])
          .filter((c) => c !== "")
          .forEach((name) => targets.push({ name, type: "同行者" }));
      }

      hideSpinner();
      setCheckInModalState({
        ticket,
        live: initialLives.find(l => l.id === selectedLiveId),
        groupSuffix,
        displayNo,
        targets,
        currentCheckedMap,
      });
    } catch (e) {
      hideSpinner();
      console.error(e);
      await writeLog({ dataId: ticketId, action: "チケット詳細取得", status: "error", errorDetail: { message: (e as Error).message } });
      await showDialog("チケット情報の取得に失敗しました", true);
    }
  };

  const handleCheckInSave = async (toAdd: Set<string>, toRemove: Set<string>) => {
    if (toAdd.size === 0 && toRemove.size === 0) { setCheckInModalState(null); return; }
    showSpinner();
    try {
      const ticket = checkInModalState!.ticket;
      const currentCheckedMap = checkInModalState!.currentCheckedMap;
      const promises: Promise<unknown>[] = [];

      toAdd.forEach((name) => {
        promises.push(addCheckIn({
          ticketId: ticket.id,
          reservationNo: ticket.reservationNo,
          liveId: ticket.liveId,
          name,
        }));
      });
      toRemove.forEach((name) => {
        const docId = currentCheckedMap[name];
        if (docId) promises.push(deleteCheckIn(docId));
      });

      await Promise.all(promises);
      hideSpinner();
      await showDialog("チェックイン情報を更新しました", true);
      setCheckInModalState(null);
      await loadData();
    } catch (e) {
      hideSpinner();
      console.error(e);
      await writeLog({ dataId: checkInModalState?.ticket.id, action: "チェックイン更新", status: "error", errorDetail: { message: (e as Error).message } });
      await showDialog("更新に失敗しました", true);
    }
  };

  // --- 当日受付登録 ---
  const handleDoorCheckIn = async (count: number) => {
    if (!selectedLiveId) { await showDialog("ライブを選択してください", true); return; }
    showSpinner();
    try {
      const randomId = Math.floor(100 + Math.random() * 900);
      const resNo = `D${randomId}`;
      await addDoorCheckIn({ reservationNo: resNo, liveId: selectedLiveId, count });
      hideSpinner();
      await showDialog(`${count}名のチェックインを登録しました`, true);
      setDoorModalOpen(false);
      await loadData();
    } catch (e) {
      hideSpinner();
      console.error(e);
      await writeLog({ dataId: selectedLiveId, action: "当日受付登録", status: "error", errorDetail: { message: (e as Error).message } });
      await showDialog("登録に失敗しました", true);
    }
  };

  // --- 当日受付削除 ---
  const handleDeleteDoor = async (checkInId: string) => {
    const confirmed = await showDialog("このチェックインを削除しますか？");
    if (!confirmed) return;
    showSpinner();
    try {
      await deleteDoorCheckIn(checkInId);
      hideSpinner();
      await showDialog("削除しました", true);
      await loadData();
    } catch (e) {
      hideSpinner();
      console.error(e);
      await writeLog({ dataId: checkInId, action: "当日受付削除", status: "error", errorDetail: { message: (e as Error).message } });
      await showDialog("削除に失敗しました", true);
    }
  };

  // --- QR検出 ---
  const handleQrDetected = (fullId: string) => {
    setQrModalOpen(false);
    const underscoreCount = (fullId.match(/_/g) || []).length;
    const gIndex = fullId.lastIndexOf("_g");
    const baseId = underscoreCount >= 2 && gIndex !== -1 ? fullId.substring(0, gIndex) : fullId;
    const exists = tickets.some((t) => t.id === baseId);
    if (exists) {
      setTimeout(() => openCheckInModal(fullId), 300);
    } else {
      showDialog("該当する予約が見つかりません", true);
    }
  };

  // --- 集計 ---
  const currentLive = initialLives.find(l => l.id === selectedLiveId);
  const feeAdvance = Number(currentLive?.feeAdvance ?? 0);
  const feeDoor = Number(currentLive?.feeDoor ?? 0);

  const stats = (() => {
    let expectedPeople = 0;
    let expectedRevenue = 0;
    tickets.forEach(t => {
      let pCount = 0;
      if (t.resType === "invite" && t.groups) {
        t.groups.forEach(g => pCount += g.companions.filter(c => c !== "").length);
      } else {
        pCount = 1 + (t.companions?.filter(c => c !== "").length ?? 0);
      }
      expectedPeople += pCount;
      expectedRevenue += pCount * feeAdvance;
    });

    let resCheckInCount = 0;
    let doorCheckInCount = 0;
    let actualRevenue = 0;

    checkIns.forEach(c => {
      if (c.type === "door") {
        doorCheckInCount++;
        actualRevenue += feeDoor;
      } else {
        resCheckInCount++;
        actualRevenue += feeAdvance;
      }
    });

    return { expectedPeople, expectedRevenue, resCheckInCount, doorCheckInCount, actualPeople: resCheckInCount + doorCheckInCount, actualRevenue };
  })();

  const { totalRows, totalSum } = (() => {
    let rows = 0, sum = 0;
    filteredTickets.forEach((t) => {
      if (t.resType === "invite" && t.groups) {
        t.groups.forEach((g) => {
          rows++;
          sum += g.companions.filter((c) => c !== "").length;
        });
      } else {
        rows++;
        sum += 1 + (t.companions?.filter((c) => c !== "").length ?? 0);
      }
    });
    return { totalRows: rows, totalSum: sum };
  })();

  // --- 行レンダリング ---
  const renderName = (name: string) => {
    if (checkedNameSet.has(name)) {
      return <span style={{ color: "#28a745" }}>✅ {name} 様</span>;
    }
    return <span>{name} 様</span>;
  };

  const renderTicketRows = () => {
    let lastUid: string | undefined;
    const rows: ReactNode[] = [];

    filteredTickets.forEach((t) => {
      const isNewUser = lastUid !== undefined && lastUid !== t.uid;
      lastUid = t.uid;
      const rowClass = isNewUser ? "group-separator" : "";
      const createdAt = t.createdAt ? format(t.createdAt, "yyyy/MM/dd HH:mm") : "-";
      const updatedAt = t.updatedAt ? format(t.updatedAt, "yyyy/MM/dd HH:mm") : "-";

      if (t.resType === "invite" && t.groups) {
        t.groups.forEach((group, gIdx) => {
          const gNo = `${t.reservationNo}-${gIdx + 1}`;
          const fullId = `${t.id}_g${gIdx + 1}`;
          const companions = group.companions.filter((c) => c !== "");
          rows.push(
            <tr key={fullId} className={gIdx === 0 ? rowClass : ""}>
              <td className="text-center">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <button className="link-button" onClick={() => openCheckInModal(fullId)}
                    style={{ fontWeight: "bold", color: "#e91e63", textDecoration: "underline" }}>
                    {gNo}
                  </button>
                  <div style={{ marginTop: "4px" }}>
                    <span className="res-type-label status-invite">招待</span>
                    <span className="count-badge">{companions.length}名</span>
                  </div>
                </div>
              </td>
              <td style={{ lineHeight: 1.7 }}>
                {companions.length > 0
                  ? companions.map((c, i) => <div key={i}>{renderName(c)}</div>)
                  : <span style={{ color: "#aaa" }}>(招待客なし)</span>}
              </td>
              <td className="rep-name-cell">
                {t.representativeName}<br />
                <small style={{ color: "#888" }}>({group.groupName})</small>
              </td>
              <td className="text-center">
                <a href={`/ticket-detail/${t.id}?g=${gIdx + 1}`}
                  target="_blank" rel="noopener noreferrer" className="ticket-link-icon" title="チケット表示">
                  <i className="fas fa-external-link-alt" />
                </a>
              </td>
              <td style={{ fontSize: "11px", color: "#666" }}>{createdAt}</td>
              <td style={{ fontSize: "11px", color: "#666" }}>{updatedAt}</td>
            </tr>
          );
        });
      } else {
        const companions = (t.companions || []).filter((c) => c !== "");
        const allCustomers = [
          ...(t.representativeName ? [t.representativeName] : []),
          ...companions,
        ];
        rows.push(
          <tr key={t.id} className={rowClass}>
            <td className="text-center">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <button className="link-button" onClick={() => openCheckInModal(t.id)}
                  style={{ fontWeight: "bold", color: "#e91e63", textDecoration: "underline" }}>
                  {t.reservationNo || "-"}
                </button>
                <div style={{ marginTop: "4px" }}>
                  <span className="res-type-label status-general">一般</span>
                  <span className="count-badge">{allCustomers.length}名</span>
                </div>
              </div>
            </td>
            <td style={{ lineHeight: 1.7 }}>
              {allCustomers.map((c, i) => <div key={i}>{renderName(c)}</div>)}
            </td>
            <td className="rep-name-cell">-</td>
            <td className="text-center">
              <a href={`/ticket-detail/${t.id}`}
                target="_blank" rel="noopener noreferrer" className="ticket-link-icon" title="チケット表示">
                <i className="fas fa-external-link-alt" />
              </a>
            </td>
            <td style={{ fontSize: "11px", color: "#666" }}>{createdAt}</td>
            <td style={{ fontSize: "11px", color: "#666" }}>{updatedAt}</td>
          </tr>
        );
      }
    });

    return rows.length > 0 ? rows : (
      <tr><td colSpan={6} className="text-center">予約データは見つかりませんでした。</td></tr>
    );
  };

  // =====================================================================
  // レンダリング
  // =====================================================================

  return (
    <main>
      <div className="page-header">
        <h1>
          <i className="fas fa-ticket-alt" /> 予約者一覧
        </h1>
      </div>

      {/* 検索フィルター */}
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0 }}>検索</h3>
          {isAdmin && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn-qr-scan"
                style={{ background: "#4caf50", boxShadow: "0 2px 8px rgba(76,175,80,0.3)", padding: "6px 12px", fontSize: "13px" }}
                onClick={async () => {
                  if (await checkLiveSelected()) setDoorModalOpen(true);
                }}
              >
                <i className="fas fa-user-plus" /> <span>当日受付</span>
              </button>
              <button
                className="btn-qr-scan"
                style={{ padding: "6px 12px", fontSize: "13px" }}
                onClick={async () => {
                  if (await checkLiveSelected()) setQrModalOpen(true);
                }}
              >
                <i className="fas fa-camera" /> <span>QRスキャン</span>
              </button>
            </div>
          )}
        </div>
        <div className="list-filter-grid">
          <select
            className="form-control"
            value={selectedLiveId}
            onChange={(e) => setSelectedLiveId(e.target.value)}
          >
            <option value="">-- ライブを選択 --</option>
            {initialLives.map((l) => (
              <option key={l.id} value={l.id}>{l.date} {l.title}</option>
            ))}
          </select>
          <input
            type="text"
            className="form-control"
            placeholder="予約Noで検索..."
            value={searchResNo}
            onChange={(e) => setSearchResNo(e.target.value)}
          />
          <input
            type="text"
            className="form-control"
            placeholder="お名前で検索..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>
        <div className="confirm-buttons">
          <button className="clear-button" onClick={() => {
            setSearchResNo("");
            setSearchName("");
            setAppliedResNo("");
            setAppliedName("");
          }}>クリア</button>
          <button className="save-button" onClick={() => {
            setAppliedResNo(searchResNo);
            setAppliedName(searchName);
          }}>
            <i className="fas fa-search" /> 検索
          </button>
        </div>

        {/* 集計レポート */}
        {selectedLiveId && (
          <div className="stats-report" style={{
            marginTop: "16px", padding: "12px", background: "#f8f9fa", borderRadius: "8px",
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.8em", color: "#666" }}>総予約（見込）</div>
              <div style={{ fontWeight: "bold", fontSize: "1.1em" }}>{stats.expectedPeople} 名</div>
              <div style={{ fontSize: "0.85em", color: "#888" }}>¥{stats.expectedRevenue.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "center", borderLeft: "1px solid #ddd" }}>
              <div style={{ fontSize: "0.8em", color: "#666" }}>総来場者数</div>
              <div style={{ fontWeight: "bold", fontSize: "1.1em", color: "#2E7D32" }}>{stats.actualPeople} 名</div>
              <div style={{ fontSize: "0.85em", color: "#888" }}>¥{stats.actualRevenue.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "center", borderLeft: "1px solid #ddd" }}>
              <div style={{ fontSize: "0.8em", color: "#666" }}>来場内訳</div>
              <div style={{ fontSize: "0.9em" }}>
                予約: {stats.resCheckInCount} / 当日: {stats.doorCheckInCount}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 予約テーブル */}
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>予約一覧</h3>
          <div style={{ fontSize: "0.9em", color: "#555" }}>
            {loading ? "読み込み中..." : `該当: ${totalRows}件 / 合計人数: ${totalSum}名`}
          </div>
        </div>
        <div className="table-wrapper">
          <table className="list-table">
            <thead>
              <tr>
                <th>予約No / 種別 / 人数</th>
                <th>お客様</th>
                <th>招待者（グループ）</th>
                <th>チケット</th>
                <th>登録日時</th>
                <th>更新日時</th>
              </tr>
            </thead>
            <tbody>{renderTicketRows()}</tbody>
          </table>
        </div>
      </div>

      {/* 当日受付テーブル */}
      <div className="container" style={{ marginTop: "24px" }}>
        <h3>当日受付</h3>
        <div className="table-wrapper">
          <table className="list-table">
            <thead>
              <tr>
                <th>受付No</th>
                <th>お客様</th>
                <th>状態</th>
                <th>時間</th>
              </tr>
            </thead>
            <tbody>
              {doorCheckIns.length === 0 ? (
                <tr><td colSpan={4} className="text-center">当日受付のデータはありません。</td></tr>
              ) : doorCheckIns.map((c) => (
                <tr key={c.id}>
                  <td className="text-center">
                    {isAdmin ? (
                      <button className="link-button" onClick={() => handleDeleteDoor(c.id)}
                        style={{ fontWeight: "bold", color: "#4caf50", textDecoration: "underline" }}>
                        {c.reservationNo}
                      </button>
                    ) : (
                      <span style={{ fontWeight: "bold", color: "#4caf50" }}>{c.reservationNo}</span>
                    )}
                  </td>
                  <td>{c.name}</td>
                  <td className="text-center">
                    <span className="badge badge-success">チェックイン済</span>
                  </td>
                  <td style={{ fontSize: "11px", color: "#666" }}>
                    {c.createdAt ? format(c.createdAt, "yyyy/MM/dd HH:mm") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="page-footer">
        <a href="/home" className="back-link">← ホームに戻る</a>
      </div>

      {/* モーダル */}
      {checkInModalState && (
        <CheckInModal
          state={checkInModalState}
          onClose={() => setCheckInModalState(null)}
          onSave={handleCheckInSave}
        />
      )}
      {doorModalOpen && (
        <DoorCheckInModal
          onClose={() => setDoorModalOpen(false)}
          onSave={handleDoorCheckIn}
          feeDoor={feeDoor}
        />
      )}
      {qrModalOpen && (
        <QrScannerModal
          onClose={() => setQrModalOpen(false)}
          onDetected={handleQrDetected}
        />
      )}
    </main>
  );
}
