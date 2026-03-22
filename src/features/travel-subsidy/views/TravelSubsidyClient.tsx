"use client";

import { useState, useEffect } from "react";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import Link from "next/link";
import { TravelSubsidy, Prefecture, Municipality } from "@/src/lib/firestore/types";
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
};

export function TravelSubsidyClient({
  initialSubsidies,
  prefectures,
  initialMunicipalityNamesMap,
  locationChecklist,
}: Props) {
  const { isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [subsidies, setSubsidies] = useState<TravelSubsidy[]>(initialSubsidies);
  const [munNamesMap, setMunNamesMap] = useState<Record<string, string>>(initialMunicipalityNamesMap);

  // 名前マップにチェックリストの情報を統合
  useEffect(() => {
    if (!locationChecklist.length) return;
    setMunNamesMap(prev => {
      const next = { ...prev };
      locationChecklist.forEach(l => {
        if (!next[l.municipalityId]) {
          next[l.municipalityId] = l.municipalityName;
        }
      });
      return next;
    });
  }, [locationChecklist, initialMunicipalityNamesMap]);

  // 追加フォーム
  const [addPrefectureId, setAddPrefectureId] = useState("");
  const [addMunicipalities, setAddMunicipalities] = useState<Municipality[]>([]);
  const [addMunicipalityId, setAddMunicipalityId] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [loadingAddMun, setLoadingAddMun] = useState(false);

  // インライン編集
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ title: "旅費補助額", href: "" }]);
  }, [setBreadcrumbs]);

  // 追加フォーム: 県変更時に市区町村をロード
  useEffect(() => {
    if (!addPrefectureId) {
      setAddMunicipalities([]);
      setAddMunicipalityId("");
      setAddAmount("");
      return;
    }
    setLoadingAddMun(true);
    setAddMunicipalityId("");
    setAddAmount("");
    getMunicipalitiesForTravelSubsidy(addPrefectureId)
      .then(list => {
        setAddMunicipalities(list);
        // 名前マップに追加
        const newMap: Record<string, string> = {};
        list.forEach(m => { newMap[m.id] = m.name; });
        setMunNamesMap(prev => ({ ...prev, ...newMap }));
      })
      .catch(() => setAddMunicipalities([]))
      .finally(() => setLoadingAddMun(false));
  }, [addPrefectureId]);

  const handleAdd = async () => {
    if (!addPrefectureId || !addMunicipalityId || !addAmount) return;
    const amount = Number(addAmount);
    if (isNaN(amount) || amount < 0) {
      await showDialog("正しい金額を入力してください", true);
      return;
    }
    const dup = subsidies.find(s => s.municipalityId === addMunicipalityId);
    if (dup) {
      await showDialog("この市区町村はすでに登録されています。編集ボタンから金額を変更してください。", true);
      return;
    }
    showSpinner();
    try {
      const newId = await saveTravelSubsidy({ prefectureId: addPrefectureId, municipalityId: addMunicipalityId, amount });
      setSubsidies(prev => [...prev, { id: newId, prefectureId: addPrefectureId, municipalityId: addMunicipalityId, amount }]);
      setAddPrefectureId("");
      setAddMunicipalityId("");
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

  const handleEditSave = async (id: string, isRegistered: boolean) => {
    const amount = Number(editAmount);
    if (isNaN(amount) || amount < 0) {
      await showDialog("正しい金額を入力してください", true);
      return;
    }
    showSpinner();
    try {
      if (isRegistered) {
        // 既存データの更新
        const target = subsidies.find(s => s.id === id)!;
        await saveTravelSubsidy({ prefectureId: target.prefectureId, municipalityId: target.municipalityId, amount }, id);
        setSubsidies(prev => prev.map(s => s.id === id ? { ...s, amount } : s));
      } else {
        // 新規データの追加（idはmunicipalityIdが入っている）
        const target = locationChecklist.find(l => l.municipalityId === id)!;
        const newId = await saveTravelSubsidy({ prefectureId: target.prefectureId, municipalityId: target.municipalityId, amount });
        setSubsidies(prev => [...prev, { id: newId, prefectureId: target.prefectureId, municipalityId: target.municipalityId, amount }]);
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

  // 都道府県ごとにグループ化（設定済み、および管理者の場合はユーザ登録済み未設定分も含む）
  const grouped = prefectures
    .map(pref => {
      // 登録済み項目
      const existing = subsidies
        .filter(s => s.prefectureId === pref.id)
        .map(s => ({ ...s, isRegistered: true }));

      // 未登録項目（管理者の場合のみ表示）
      const unregistered = isAdmin
        ? locationChecklist
            .filter(l => l.prefectureId === pref.id && !subsidies.some(s => s.municipalityId === l.municipalityId))
            .map(l => ({
              id: l.municipalityId, // IDがないのでmunicipalityIdで代用
              prefectureId: l.prefectureId,
              municipalityId: l.municipalityId,
              amount: 0,
              isRegistered: false,
            }))
        : [];

      const items = [...existing, ...unregistered].sort((a, b) =>
        (munNamesMap[a.municipalityId] ?? "").localeCompare(munNamesMap[b.municipalityId] ?? "", "ja")
      );

      return { prefecture: pref, items };
    })
    .filter(g => g.items.length > 0);

  return (
    <BaseLayout>
      <div className="page-header">
        <h1>
          <i className="fa-solid fa-train" style={{ marginRight: "0.5rem" }} />
          旅費補助額
        </h1>
      </div>

      {/* 設定一覧 */}
      <div className="container">
        <h3 style={{ marginTop: 0 }}>
          設定一覧
        </h3>

        {grouped.length === 0 ? (
          <p style={{ color: "#999", textAlign: "center", padding: "2rem 0" }}>
            設定されているデータがありません
          </p>
        ) : (
          grouped.map(({ prefecture, items }) => (
            <div key={prefecture.id} style={{ marginBottom: "1.5rem" }}>
              <div style={{
                fontSize: "0.85rem",
                fontWeight: "bold",
                color: "#4caf50",
                borderBottom: "2px solid #4caf50",
                paddingBottom: "4px",
                marginBottom: "4px",
              }}>
                {prefecture.name}
              </div>
              {items.map(item => (
                <SubsidyRow
                  key={item.id}
                  subsidy={item as any}
                  municipalityName={munNamesMap[item.municipalityId] ?? item.municipalityId}
                  isAdmin={isAdmin}
                  isEditing={editingId === item.id}
                  editAmount={editAmount}
                  onEditStart={() => handleEditStart(item as any)}
                  onEditAmountChange={setEditAmount}
                  onEditSave={() => handleEditSave(item.id, !!item.isRegistered)}
                  onEditCancel={() => setEditingId(null)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* 管理者: 新規追加フォーム */}
      {isAdmin && (
        <div className="container">
          <h3 style={{ marginTop: 0 }}>
            ＋ 新規追加
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "4px" }}>都道府県</label>
              <select
                className="form-control"
                value={addPrefectureId}
                onChange={e => setAddPrefectureId(e.target.value)}
              >
                <option value="">--- 選択してください ---</option>
                {prefectures.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#666", marginBottom: "4px" }}>市区町村</label>
              <select
                className="form-control"
                value={addMunicipalityId}
                onChange={e => { setAddMunicipalityId(e.target.value); setAddAmount(""); }}
                disabled={!addPrefectureId || loadingAddMun}
              >
                <option value="">{loadingAddMun ? "読み込み中..." : "--- 選択してください ---"}</option>
                {addMunicipalities.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
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
                  disabled={!addMunicipalityId}
                />
                <span style={{ color: "#555" }}>円</span>
              </div>
            </div>

            <button
              className="save-button"
              onClick={handleAdd}
              disabled={!addPrefectureId || !addMunicipalityId || !addAmount}
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
  subsidy: TravelSubsidy & { isRegistered: boolean };
  municipalityName: string;
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
  municipalityName, subsidy, isAdmin, isEditing, editAmount,
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
        <span style={{ fontSize: "0.95rem" }}>{municipalityName}</span>
        {!isRegistered && (
          <span style={{ fontSize: "0.75rem", color: "#c62828", fontWeight: "bold" }}>未登録</span>
        )}
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
