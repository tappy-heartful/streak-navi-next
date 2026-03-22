"use client";

import { useState, useEffect } from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import Link from "next/link";
import { TravelSubsidy, Prefecture, Municipality, TravelConfig, TravelPoint } from "@/src/lib/firestore/types";
import {
  getMunicipalitiesForTravelSubsidy,
  saveTravelSubsidy,
  deleteTravelSubsidy,
} from "@/src/features/travel-subsidy/api/travel-subsidy-client-service";
import { LocationCheckItem } from "@/src/features/travel-subsidy/api/travel-subsidy-server-actions";

type Props = {
  initialSubsidies: TravelSubsidy[];
  prefectures: Prefecture[];
  initialMunicipalityNamesMap: Record<string, string>;
  locationChecklist: LocationCheckItem[];
  travelConfig: TravelConfig;
};

export function TravelSubsidyClient({
  initialSubsidies,
  prefectures,
  initialMunicipalityNamesMap,
  locationChecklist,
  travelConfig,
}: Props) {
  const { isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [subsidies, setSubsidies] = useState<TravelSubsidy[]>(initialSubsidies);
  const [munNamesMap, setMunNamesMap] = useState<Record<string, string>>(initialMunicipalityNamesMap);

  // 名前マップに情報を統合
  useEffect(() => {
    setMunNamesMap(prev => {
      const next = { ...prev };
      locationChecklist.forEach(l => {
        if (!next[l.municipalityId]) next[l.municipalityId] = l.municipalityName;
      });
      return next;
    });
  }, [locationChecklist]);

  // 追加フォーム
  const [addDeparturePrefId, setAddDeparturePrefId] = useState("");
  const [addDepartureMunId, setAddDepartureMunId] = useState("");
  const [addDepartureMuns, setAddDepartureMuns] = useState<Municipality[]>([]);
  const [addArrivalId, setAddArrivalId] = useState("");   // "prefId_munId" format
  const [addAmount, setAddAmount] = useState("");

  // インライン編集
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ title: "旅費補助額", href: "" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (!addDeparturePrefId) {
      setAddDepartureMuns([]);
      setAddDepartureMunId("");
      return;
    }
    const fetchMuns = async () => {
      const list = await getMunicipalitiesForTravelSubsidy(addDeparturePrefId);
      setAddDepartureMuns(list);
    };
    fetchMuns();
  }, [addDeparturePrefId]);

  useEffect(() => {
    if (travelConfig.arrivalPoints.length === 1) {
      const p = travelConfig.arrivalPoints[0];
      setAddArrivalId(`${p.prefectureId}_${p.municipalityId}`);
    }
  }, [travelConfig.arrivalPoints]);

  const handleAdd = async () => {
    if (!addDeparturePrefId || !addDepartureMunId || !addArrivalId || !addAmount) return;
    const amount = Number(addAmount);
    if (isNaN(amount) || amount < 0) {
      await showDialog("正しい金額を入力してください", true);
      return;
    }

    const dPref = addDeparturePrefId;
    const dMun = addDepartureMunId;
    const [aPref, aMun] = addArrivalId.split("_");

    const dup = subsidies.find(s =>
      s.departureMunicipalityId === dMun && s.arrivalMunicipalityId === aMun
    );
    if (dup) {
      await showDialog("この区間の設定はすでに存在します。", true);
      return;
    }

    showSpinner();
    try {
      const newId = await saveTravelSubsidy({
        departurePrefectureId: dPref,
        departureMunicipalityId: dMun,
        arrivalPrefectureId: aPref,
        arrivalMunicipalityId: aMun,
        amount,
      });
      setSubsidies(prev => [...prev, {
        id: newId,
        departurePrefectureId: dPref,
        departureMunicipalityId: dMun,
        arrivalPrefectureId: aPref,
        arrivalMunicipalityId: aMun,
        amount,
      }]);
      // 名前マップを更新（新規追加された市区町村名が反映されるように）
      const munName = addDepartureMuns.find(m => m.id === dMun)?.name;
      if (munName) {
        setMunNamesMap(prev => ({ ...prev, [dMun]: munName }));
      }
      setAddAmount("");
    } catch {
      await showDialog("保存に失敗しました", true);
    } finally {
      hideSpinner();
    }
  };

  const handleEditStart = (subsidy: TravelSubsidy) => {
    setEditingId(subsidy.id);
    setEditAmount(String(subsidy.amount));
  };

  const handleEditSave = async (id: string, isRegistered: boolean, extraData?: any) => {
    const amount = Number(editAmount);
    if (isNaN(amount) || amount < 0) {
      await showDialog("正しい金額を入力してください", true);
      return;
    }
    showSpinner();
    try {
      if (isRegistered) {
        const target = subsidies.find(s => s.id === id)!;
        await saveTravelSubsidy({
          departurePrefectureId: target.departurePrefectureId,
          departureMunicipalityId: target.departureMunicipalityId,
          arrivalPrefectureId: target.arrivalPrefectureId,
          arrivalMunicipalityId: target.arrivalMunicipalityId,
          amount,
        }, id);
        setSubsidies(prev => prev.map(s => s.id === id ? { ...s, amount } : s));
      } else {
        // 未登録項目からの追加
        const { dPref, dMun, aPref, aMun } = extraData;
        const newId = await saveTravelSubsidy({
          departurePrefectureId: dPref,
          departureMunicipalityId: dMun,
          arrivalPrefectureId: aPref,
          arrivalMunicipalityId: aMun,
          amount,
        });
        setSubsidies(prev => [...prev, {
          id: newId,
          departurePrefectureId: dPref,
          departureMunicipalityId: dMun,
          arrivalPrefectureId: aPref,
          arrivalMunicipalityId: aMun,
          amount,
        }]);
      }
      setEditingId(null);
    } catch {
      await showDialog("保存に失敗しました", true);
    } finally {
      hideSpinner();
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showDialog("この設定を削除しますか？");
    if (!confirmed) return;
    showSpinner();
    try {
      await deleteTravelSubsidy(id);
      setSubsidies(prev => prev.filter(s => s.id !== id));
    } catch {
      await showDialog("削除に失敗しました", true);
    } finally {
      hideSpinner();
    }
  };

  const getPointName = (prefId: string, munId: string) => {
    const pName = prefectures.find(p => p.id === prefId)?.name || prefId;
    const mName = munNamesMap[munId] || munId;
    return `${mName} (${pName})`;
  };

  // 到着地ごとにコンテナを作成
  const containers = travelConfig.arrivalPoints.map(arrivalPoint => {
    const existing = subsidies
      .filter(s => s.arrivalPrefectureId === arrivalPoint.prefectureId && s.arrivalMunicipalityId === arrivalPoint.municipalityId)
      .map(s => {
        const checkItem = locationChecklist.find(l => l.municipalityId === s.departureMunicipalityId);
        return { ...s, isRegistered: true, userCount: checkItem?.userCount ?? 0 };
      });

    // 管理者の場合、ユーザ居住地データにあるが未設定の出発地を含める
    const unregistered = isAdmin
      ? locationChecklist
        .filter(loc => !existing.some(s => s.departureMunicipalityId === loc.municipalityId))
        .map(loc => ({
          id: `unreg-${arrivalPoint.municipalityId}-${loc.municipalityId}`,
          departurePrefectureId: loc.prefectureId,
          departureMunicipalityId: loc.municipalityId,
          arrivalPrefectureId: arrivalPoint.prefectureId,
          arrivalMunicipalityId: arrivalPoint.municipalityId,
          amount: 0,
          isRegistered: false,
          userCount: loc.userCount,
        }))
      : [];

    const items: (TravelSubsidy & { isRegistered: boolean; userCount: number })[] = [
      ...existing,
      ...unregistered as any
    ];

    const totalUserCount = items.reduce((sum, item) => sum + item.userCount, 0);

    // 県ごとにグループ化
    const prefectureGroups = prefectures
      .map(pref => {
        const prefItems = items.filter(item => item.departurePrefectureId === pref.id);
        if (prefItems.length === 0) return null;
        return {
          pref,
          prefItems: prefItems.sort((a, b) =>
            (munNamesMap[a.departureMunicipalityId] ?? "").localeCompare(munNamesMap[b.departureMunicipalityId] ?? "", "ja")
          ),
          groupUserCount: prefItems.reduce((sum, item) => sum + item.userCount, 0),
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);

    return {
      arrivalPoint,
      prefectureGroups,
      totalUserCount,
    };
  });

  return (
    <BaseLayout>
      <div className="page-header">
        <h1>
          <i className="fa-solid fa-train" style={{ marginRight: "0.5rem" }} />
          旅費補助額
        </h1>
      </div>

      {isAdmin && (
        <div className="container" style={{
          background: "#fff9c4",
          marginBottom: "1.5rem",
          fontSize: "0.85rem",
          color: "#856404",
          border: "1px solid #ffeeba",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 15px", // クラスの上書きを避けるため残すが、必要に応じて調整
        }}>
          <i className="fa-solid fa-circle-info" />
          <span>管理ユーザーのみ設定できます。一般ユーザーには居住者数および「補助額未設定の市区町村」は見えません。</span>
        </div>
      )}

      {/* 到着地ごとのコンテナ */}
      {containers.map(({ arrivalPoint, prefectureGroups, totalUserCount }) => {
        const arrivalPrefName = prefectures.find(p => p.id === arrivalPoint.prefectureId)?.name || "";
        const arrivalMunName = munNamesMap[arrivalPoint.municipalityId] || arrivalPoint.municipalityId;

        return (
          <div key={`${arrivalPoint.prefectureId}_${arrivalPoint.municipalityId}`} className="container" style={{ marginBottom: "2rem" }}>
            <h3 style={{ marginTop: 0, color: "#4caf50", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span>
                <i className="fa-solid fa-location-dot" style={{ marginRight: "0.5rem", fontSize: "0.9em" }} />
                {arrivalPrefName}{arrivalMunName}までの旅費
              </span>
            </h3>

            <div>
              {prefectureGroups.length === 0 ? (
                <p style={{ color: "#999", textAlign: "center", padding: "1rem 0" }}>設定可能な出発地がありません</p>
              ) : (
                prefectureGroups.map(({ pref, prefItems, groupUserCount }) => (
                  <div key={pref.id} style={{ marginBottom: "1.5rem" }}>
                    <h4 style={{
                      fontSize: "0.9rem",
                      color: "#666",
                      borderBottom: "1px solid #eee",
                      paddingBottom: "4px",
                      marginBottom: "8px",
                      display: "flex",
                      justifyContent: "space-between"
                    }}>
                      <span>{pref.name}</span>
                      {isAdmin && groupUserCount > 0 && (
                        <span style={{ fontWeight: "normal", fontSize: "0.8em" }}>{groupUserCount}名居住</span>
                      )}
                    </h4>
                    {prefItems.map(item => (
                      <SubsidyRow
                        key={item.id}
                        subsidy={item}
                        departureName={munNamesMap[item.departureMunicipalityId] ?? item.departureMunicipalityId}
                        departurePrefName={pref.name}
                        isAdmin={isAdmin}
                        isEditing={editingId === item.id}
                        editAmount={editAmount}
                        onEditStart={() => handleEditStart(item)}
                        onEditAmountChange={setEditAmount}
                        onEditSave={() => handleEditSave(item.id, !!item.isRegistered, {
                          dPref: item.departurePrefectureId,
                          dMun: item.departureMunicipalityId,
                          aPref: item.arrivalPrefectureId,
                          aMun: item.arrivalMunicipalityId
                        })}
                        onEditCancel={() => setEditingId(null)}
                        onDelete={() => handleDelete(item.id)}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* 管理者: 新規追加フォーム */}
      {isAdmin && (
        <div className="container" style={{ borderTop: "4px solid #4caf50" }}>
          <h3 style={{ marginTop: 0 }}>
            ＋ 新規追加
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* 出発地選択（行分け） */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "4px" }}>出発地（都道府県）</label>
              <select
                className="form-control"
                value={addDeparturePrefId}
                onChange={e => setAddDeparturePrefId(e.target.value)}
              >
                <option value="">--- 都道府県を選択 ---</option>
                {prefectures.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "4px" }}>出発地（市区町村）</label>
              <select
                className="form-control"
                value={addDepartureMunId}
                onChange={e => setAddDepartureMunId(e.target.value)}
                disabled={!addDeparturePrefId}
              >
                <option value="">--- 市区町村を選択 ---</option>
                {addDepartureMuns.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* 到着地選択 */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "4px" }}>到着地</label>
              <select
                className="form-control"
                value={addArrivalId}
                onChange={e => setAddArrivalId(e.target.value)}
              >
                <option value="">--- 到着地を選択 ---</option>
                {travelConfig.arrivalPoints.map(p => {
                  const pName = prefectures.find(pref => pref.id === p.prefectureId)?.name || "";
                  const mName = munNamesMap[p.municipalityId] || p.municipalityId;
                  return (
                    <option key={`arr-${p.prefectureId}-${p.municipalityId}`} value={`${p.prefectureId}_${p.municipalityId}`}>
                      {pName}{mName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "4px" }}>補助額</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  className="form-control"
                  value={addAmount}
                  onChange={e => setAddAmount(e.target.value)}
                  placeholder="例: 5000"
                  min="0"
                />
                <span style={{ color: "#555" }}>円</span>
              </div>
            </div>

            <button
              className="save-button"
              onClick={handleAdd}
              disabled={!addDeparturePrefId || !addDepartureMunId || !addArrivalId || !addAmount}
              style={{ marginTop: "0.25rem" }}
            >
              追加する
            </button>
          </div>
        </div>
      )}

      <div className="page-footer">
        <Link href="/home" className="back-link">← ホームに戻る</Link>
      </div>
    </BaseLayout>
  );
}

// ===== 行コンポーネント =====

type SubsidyRowProps = {
  subsidy: TravelSubsidy & { isRegistered: boolean; userCount: number };
  departureName: string;
  departurePrefName: string;
  isAdmin: boolean;
  isEditing: boolean;
  editAmount: string;
  onEditStart: () => void;
  onEditAmountChange: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
};

function SubsidyRow({
  departureName, departurePrefName, subsidy, isAdmin, isEditing, editAmount,
  onEditStart, onEditAmountChange, onEditSave, onEditCancel, onDelete,
}: SubsidyRowProps) {
  const isRegistered = subsidy.isRegistered;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 8px",
      borderBottom: "1px solid #f0f0f0",
      gap: "8px",
      background: !isRegistered ? "#fff9f9" : "transparent",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.95rem" }}>
            {departureName}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
          {isAdmin && subsidy.userCount > 0 && (
            <span style={{ fontSize: "0.75rem", color: "#888" }}>
              {subsidy.userCount}名居住
            </span>
          )}
          {!isRegistered && (
            <span style={{ fontSize: "0.75rem", color: "#c62828", fontWeight: "bold" }}>未登録</span>
          )}
        </div>
      </div>

      {isEditing ? (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            type="number"
            value={editAmount}
            onChange={e => onEditAmountChange(e.target.value)}
            min="0"
            style={{ width: "100px", padding: "6px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "0.9rem" }}
            autoFocus
          />
          <span style={{ fontSize: "0.85rem", color: "#555" }}>円</span>
        </div>
      ) : (
        <span style={{ fontWeight: "bold", color: isRegistered ? "#2c3e50" : "#999", minWidth: "80px", textAlign: "right" }}>
          {isRegistered ? `¥${subsidy.amount.toLocaleString()}` : "---"}
        </span>
      )}

      {isAdmin && (
        isEditing ? (
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={onEditSave}
              style={{ padding: "5px 12px", background: "#4caf50", color: "white", border: "none", borderRadius: "4px", fontSize: "0.8rem", cursor: "pointer" }}
            >
              保存
            </button>
            <button
              onClick={onEditCancel}
              style={{ padding: "5px 10px", background: "#ccc", color: "#333", border: "none", borderRadius: "4px", fontSize: "0.8rem", cursor: "pointer" }}
            >
              取消
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={onEditStart}
              className={isRegistered ? "edit-button" : "save-button"}
              style={{ padding: "5px 10px", fontSize: "0.8rem" }}
            >
              {isRegistered ? "編集" : "登録"}
            </button>
            {isRegistered && (
              <button
                onClick={onDelete}
                className="delete-button"
                style={{ padding: "5px 10px", fontSize: "0.8rem" }}
              >
                削除
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
