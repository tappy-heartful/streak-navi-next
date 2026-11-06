"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { Instrument, Section, Role, Genre, InstrumentPart } from "@/src/lib/firestore/types";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { showDialog, showSpinner, hideSpinner, writeLog } from "@/src/lib/functions";
import {
  saveInstrument,
  deleteInstrument,
  saveDefaultInstrumentConfig,
  saveSection,
  deleteSection,
  saveRole,
  deleteRole,
  saveGenre,
  deleteGenre,
  getClientInstruments,
  getClientSections,
  getClientRoles,
  getClientGenres,
  getClientDefaultInstrumentConfig,
} from "../api/master-client-service";
import { DEFAULT_INSTRUMENT_CONFIG } from "@/src/lib/firestore/master-defaults";
import styles from "./MasterMaintenance.module.css";

type TabType = "instruments" | "defaultConfig" | "sections" | "roles" | "genres";

type Props = {
  initialInstruments: Instrument[];
  initialSections: Section[];
  initialRoles: Role[];
  initialGenres: Genre[];
  initialDefaultInstrumentConfig: Record<string, InstrumentPart[]>;
};

export function MasterMaintenanceClient({
  initialInstruments,
  initialSections,
  initialRoles,
  initialGenres,
  initialDefaultInstrumentConfig,
}: Props) {
  const router = useRouter();
  const { userData, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  // マスタ管理者またはシステム管理者
  const canEdit = !!(userData?.isMasterAdmin || userData?.isSystemAdmin);

  const [activeTab, setActiveTab] = useState<TabType>("instruments");

  // マスタデータステート
  const [instruments, setInstruments] = useState<Instrument[]>(initialInstruments);
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [genres, setGenres] = useState<Genre[]>(initialGenres);
  const [defaultConfig, setDefaultConfig] = useState<Record<string, InstrumentPart[]>>(
    initialDefaultInstrumentConfig
  );

  // モーダルステート
  const [instModalOpen, setInstModalOpen] = useState(false);
  const [editingInst, setEditingInst] = useState<Instrument | null>(null);
  const [isInstNew, setIsInstNew] = useState(false);

  const [secModalOpen, setSecModalOpen] = useState(false);
  const [editingSec, setEditingSec] = useState<Section | null>(null);
  const [isSecNew, setIsSecNew] = useState(false);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isRoleNew, setIsRoleNew] = useState(false);

  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [isGenreNew, setIsGenreNew] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ title: "マスタ管理", href: "/master" }]);
  }, [setBreadcrumbs]);

  // 権限ガード
  useEffect(() => {
    if (loading) return;
    if (!canEdit) {
      showDialog("マスタ管理を行う権限がありません。", true).then(() => router.push("/home"));
    }
  }, [loading, canEdit, router]);

  // セクションマップ
  const sectionMap = useMemo(() => {
    const map = new Map<string, Section>();
    sections.forEach((s) => map.set(s.id, s));
    return map;
  }, [sections]);

  // ==========================================
  // 楽器ハンドラー
  // ==========================================
  const handleOpenAddInst = () => {
    const defaultSecId = sections[0]?.id || "1";
    setEditingInst({
      id: "",
      name: "",
      sectionId: defaultSecId,
      order: 10,
    });
    setIsInstNew(true);
    setInstModalOpen(true);
  };

  const handleOpenEditInst = (inst: Instrument) => {
    setEditingInst({ ...inst });
    setIsInstNew(false);
    setInstModalOpen(true);
  };

  const handleSaveInst = async () => {
    if (!editingInst) return;
    if (!editingInst.id.trim()) {
      await showDialog("楽器ID（英数字・記号）を入力してください", true);
      return;
    }
    if (!editingInst.name.trim()) {
      await showDialog("楽器名を入力してください", true);
      return;
    }
    if (!editingInst.sectionId) {
      await showDialog("所属パートを選択してください", true);
      return;
    }

    showSpinner();
    try {
      await saveInstrument(editingInst);
      const updated = await getClientInstruments();
      setInstruments(updated);
      setInstModalOpen(false);
      hideSpinner();
      await showDialog(`楽器「${editingInst.name}」を${isInstNew ? "追加" : "更新"}しました。`, true);
    } catch (err) {
      hideSpinner();
      console.error(err);
      await showDialog("楽器の保存に失敗しました", true);
    }
  };

  const handleDeleteInst = async (inst: Instrument) => {
    const confirmed = await showDialog(`楽器「${inst.name}」を削除しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteInstrument(inst.id);
      const updated = await getClientInstruments();
      setInstruments(updated);
      hideSpinner();
      await showDialog(`楽器「${inst.name}」を削除しました。`, true);
    } catch (err) {
      hideSpinner();
      console.error(err);
      await showDialog("楽器の削除に失敗しました", true);
    }
  };

  // ==========================================
  // デフォルト楽器構成ハンドラー
  // ==========================================
  const handleAddDefaultPart = (sectionId: string) => {
    setDefaultConfig((prev) => {
      const current = prev[sectionId] || [];
      return {
        ...prev,
        [sectionId]: [...current, { partName: "", instrumentId: "" }],
      };
    });
  };

  const handleRemoveDefaultPart = (sectionId: string, partIdx: number) => {
    setDefaultConfig((prev) => {
      const current = prev[sectionId] || [];
      return {
        ...prev,
        [sectionId]: current.filter((_, i) => i !== partIdx),
      };
    });
  };

  const handleUpdateDefaultPart = (
    sectionId: string,
    partIdx: number,
    field: "partName" | "instrumentId",
    val: string
  ) => {
    setDefaultConfig((prev) => {
      const current = prev[sectionId] || [];
      return {
        ...prev,
        [sectionId]: current.map((p, i) => (i === partIdx ? { ...p, [field]: val } : p)),
      };
    });
  };

  const handleResetStandardConfig = async () => {
    const confirmed = await showDialog(
      "ビッグバンド標準17人編成（サックス5, トランペット4, トロンボーン4, リズム4）をセットしますか？"
    );
    if (!confirmed) return;
    setDefaultConfig({ ...DEFAULT_INSTRUMENT_CONFIG });
  };

  const handleSaveDefaultConfig = async () => {
    showSpinner();
    try {
      await saveDefaultInstrumentConfig(defaultConfig, userData?.displayName || undefined);
      hideSpinner();
      await showDialog("デフォルトの楽器構成を保存しました！\n今後の譜面作成時に標準として適用されます。", true);
    } catch (err) {
      hideSpinner();
      console.error(err);
      await showDialog("デフォルト楽器構成の保存に失敗しました", true);
    }
  };

  // ==========================================
  // セクションハンドラー
  // ==========================================
  const handleOpenAddSec = () => {
    setEditingSec({ id: "", name: "", order: 10, color: "#0284c7" });
    setIsSecNew(true);
    setSecModalOpen(true);
  };

  const handleOpenEditSec = (sec: Section) => {
    setEditingSec({ ...sec });
    setIsSecNew(false);
    setSecModalOpen(true);
  };

  const handleSaveSec = async () => {
    if (!editingSec || !editingSec.id.trim() || !editingSec.name.trim()) {
      await showDialog("パートIDとパート名を入力してください", true);
      return;
    }
    showSpinner();
    try {
      await saveSection(editingSec);
      const updated = await getClientSections();
      setSections(updated);
      setSecModalOpen(false);
      hideSpinner();
      await showDialog(`パート「${editingSec.name}」を保存しました。`, true);
    } catch (err) {
      hideSpinner();
      console.error(err);
      await showDialog("パートの保存に失敗しました", true);
    }
  };

  const handleDeleteSec = async (sec: Section) => {
    const confirmed = await showDialog(`パート「${sec.name}」を削除しますか？`);
    if (!confirmed) return;
    showSpinner();
    try {
      await deleteSection(sec.id);
      const updated = await getClientSections();
      setSections(updated);
      hideSpinner();
      await showDialog(`パート「${sec.name}」を削除しました。`, true);
    } catch (err) {
      hideSpinner();
      console.error(err);
      await showDialog("パートの削除に失敗しました", true);
    }
  };

  // ==========================================
  // 役職ハンドラー
  // ==========================================
  const handleOpenAddRole = () => {
    setEditingRole({ id: "", name: "", order: 10 });
    setIsRoleNew(true);
    setRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: Role) => {
    setEditingRole({ ...role });
    setIsRoleNew(false);
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editingRole || !editingRole.id.trim() || !editingRole.name.trim()) {
      await showDialog("役職IDと役職名を入力してください", true);
      return;
    }
    showSpinner();
    try {
      await saveRole(editingRole);
      const updated = await getClientRoles();
      setRoles(updated);
      setRoleModalOpen(false);
      hideSpinner();
      await showDialog(`役職「${editingRole.name}」を保存しました。`, true);
    } catch (err) {
      hideSpinner();
      console.error(err);
      await showDialog("役職の保存に失敗しました", true);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    const confirmed = await showDialog(`役職「${role.name}」を削除しますか？`);
    if (!confirmed) return;
    showSpinner();
    try {
      await deleteRole(role.id);
      const updated = await getClientRoles();
      setRoles(updated);
      hideSpinner();
      await showDialog(`役職「${role.name}」を削除しました。`, true);
    } catch (err) {
      hideSpinner();
      console.error(err);
      await showDialog("役職の削除に失敗しました", true);
    }
  };

  // ==========================================
  // ジャンルハンドラー
  // ==========================================
  const handleOpenAddGenre = () => {
    setEditingGenre({ id: "", name: "" });
    setIsGenreNew(true);
    setGenreModalOpen(true);
  };

  const handleOpenEditGenre = (genre: Genre) => {
    setEditingGenre({ ...genre });
    setIsGenreNew(false);
    setGenreModalOpen(true);
  };

  const handleSaveGenre = async () => {
    if (!editingGenre || !editingGenre.id.trim() || !editingGenre.name.trim()) {
      await showDialog("ジャンルIDとジャンル名を入力してください", true);
      return;
    }
    showSpinner();
    try {
      await saveGenre(editingGenre);
      const updated = await getClientGenres();
      setGenres(updated);
      setGenreModalOpen(false);
      hideSpinner();
      await showDialog(`ジャンル「${editingGenre.name}」を保存しました。`, true);
    } catch (err) {
      hideSpinner();
      console.error(err);
      await showDialog("ジャンルの保存に失敗しました", true);
    }
  };

  const handleDeleteGenre = async (genre: Genre) => {
    const confirmed = await showDialog(`ジャンル「${genre.name}」を削除しますか？`);
    if (!confirmed) return;
    showSpinner();
    try {
      await deleteGenre(genre.id);
      const updated = await getClientGenres();
      setGenres(updated);
      hideSpinner();
      await showDialog(`ジャンル「${genre.name}」を削除しました。`, true);
    } catch (err) {
      hideSpinner();
      console.error(err);
      await showDialog("ジャンルの削除に失敗しました", true);
    }
  };

  if (!canEdit) return null;

  return (
    <BaseLayout>
      <div className={styles.container}>
        {/* タブバー */}
        <div className={styles.tabsWrapper}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "instruments" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("instruments")}
          >
            <i className="fa-solid fa-guitar" /> 楽器マスタ
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "defaultConfig" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("defaultConfig")}
          >
            <i className="fa-solid fa-wand-magic-sparkles" /> デフォルト楽器構成
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "sections" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("sections")}
          >
            <i className="fa-solid fa-layer-group" /> パート (セクション)
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "roles" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("roles")}
          >
            <i className="fa-solid fa-user-gear" /> 役職
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === "genres" ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab("genres")}
          >
            <i className="fa-solid fa-music" /> ジャンル
          </button>
        </div>

        {/* ========================================================
            タブ 1: 楽器マスタ
            ======================================================== */}
        {activeTab === "instruments" && (
          <div>
            <div className={styles.toolbar}>
              <div className={styles.titleArea}>
                <h2 className={styles.tabTitle}>楽器マスタ</h2>
                <span className={styles.itemCountBadge}>{instruments.length}件</span>
              </div>
              <button type="button" className={styles.btnAddItem} onClick={handleOpenAddInst}>
                <i className="fa-solid fa-plus" /> 楽器を追加
              </button>
            </div>

            <div className={styles.tableCard}>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>表示順</th>
                      <th style={{ width: "120px" }}>所属パート</th>
                      <th>楽器名</th>
                      <th style={{ width: "100px" }}>ID</th>
                      <th style={{ width: "120px", textAlign: "right" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instruments.map((inst) => {
                      const sec = sectionMap.get(inst.sectionId);
                      return (
                        <tr key={inst.id}>
                          <td>{inst.order ?? "-"}</td>
                          <td>
                            <span
                              className={styles.sectionBadge}
                              style={{
                                borderLeft: `3px solid ${sec?.color || "#0284c7"}`,
                              }}
                            >
                              {sec?.name || inst.sectionId}
                            </span>
                          </td>
                          <td>
                            <strong>{inst.name}</strong>
                          </td>
                          <td>
                            <code>{inst.id}</code>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className={styles.actionButtons} style={{ justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                className={styles.btnEdit}
                                onClick={() => handleOpenEditInst(inst)}
                              >
                                編集
                              </button>
                              <button
                                type="button"
                                className={styles.btnDelete}
                                onClick={() => handleDeleteInst(inst)}
                              >
                                削除
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            タブ 2: デフォルト楽器構成
            ======================================================== */}
        {activeTab === "defaultConfig" && (
          <div className={styles.defaultConfigSection}>
            <div className={styles.toolbar}>
              <div>
                <h2 className={styles.tabTitle}>デフォルト楽器構成</h2>
                <p className={styles.helperText}>
                  新しく譜面を登録する際の「標準の楽器構成」を設定・保存できます。
                </p>
              </div>
              <div className={styles.defaultConfigActions}>
                <button
                  type="button"
                  className={styles.btnResetStandard}
                  onClick={handleResetStandardConfig}
                >
                  <i className="fa-solid fa-rotate-left" /> 標準17人編成をセット
                </button>
                <button
                  type="button"
                  className={styles.btnSaveConfig}
                  onClick={handleSaveDefaultConfig}
                >
                  <i className="fa-solid fa-floppy-disk" /> 設定を保存する
                </button>
              </div>
            </div>

            {sections.map((sec) => {
              const parts = defaultConfig[sec.id] || [];
              const sectionInstruments = instruments.filter((i) => i.sectionId === sec.id);

              return (
                <div key={sec.id} className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.sectionTitle}>
                      <span
                        style={{
                          width: "4px",
                          height: "16px",
                          backgroundColor: sec.color || "#0284c7",
                          borderRadius: "2px",
                          display: "inline-block",
                        }}
                      />
                      {sec.name} ({parts.length}パート)
                    </h4>
                  </div>

                  {parts.map((part, partIdx) => (
                    <div key={partIdx} className={styles.partRow}>
                      <input
                        type="text"
                        value={part.partName}
                        onChange={(e) =>
                          handleUpdateDefaultPart(sec.id, partIdx, "partName", e.target.value)
                        }
                        placeholder="パート名 (例: A1, Lead)"
                        className={styles.partInput}
                        maxLength={10}
                      />
                      <select
                        value={part.instrumentId || ""}
                        onChange={(e) =>
                          handleUpdateDefaultPart(sec.id, partIdx, "instrumentId", e.target.value)
                        }
                        className={styles.partSelect}
                      >
                        <option value="">楽器を選択</option>
                        {sectionInstruments.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className={styles.btnRemovePart}
                        onClick={() => handleRemoveDefaultPart(sec.id, partIdx)}
                        title="削除"
                      >
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className={styles.btnAddPart}
                    onClick={() => handleAddDefaultPart(sec.id)}
                  >
                    <i className="fa-solid fa-plus" /> {sec.name}のパートを追加
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================
            タブ 3: パート (セクション)
            ======================================================== */}
        {activeTab === "sections" && (
          <div>
            <div className={styles.toolbar}>
              <div className={styles.titleArea}>
                <h2 className={styles.tabTitle}>パート (セクション) マスタ</h2>
                <span className={styles.itemCountBadge}>{sections.length}件</span>
              </div>
              <button type="button" className={styles.btnAddItem} onClick={handleOpenAddSec}>
                <i className="fa-solid fa-plus" /> パートを追加
              </button>
            </div>

            <div className={styles.tableCard}>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>表示順</th>
                      <th>パート名</th>
                      <th style={{ width: "100px" }}>ID</th>
                      <th style={{ width: "120px" }}>テーマ色</th>
                      <th style={{ width: "120px", textAlign: "right" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((sec) => (
                      <tr key={sec.id}>
                        <td>{sec.order ?? "-"}</td>
                        <td>
                          <strong>{sec.name}</strong>
                        </td>
                        <td>
                          <code>{sec.id}</code>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                width: "18px",
                                height: "18px",
                                borderRadius: "4px",
                                backgroundColor: sec.color || "#0284c7",
                                display: "inline-block",
                                border: "1px solid #cbd5e1",
                              }}
                            />
                            <span style={{ fontSize: "12px", color: "#64748b" }}>{sec.color || "#0284c7"}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className={styles.actionButtons} style={{ justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className={styles.btnEdit}
                              onClick={() => handleOpenEditSec(sec)}
                            >
                              編集
                            </button>
                            <button
                              type="button"
                              className={styles.btnDelete}
                              onClick={() => handleDeleteSec(sec)}
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            タブ 4: 役職マスタ
            ======================================================== */}
        {activeTab === "roles" && (
          <div>
            <div className={styles.toolbar}>
              <div className={styles.titleArea}>
                <h2 className={styles.tabTitle}>役職マスタ</h2>
                <span className={styles.itemCountBadge}>{roles.length}件</span>
              </div>
              <button type="button" className={styles.btnAddItem} onClick={handleOpenAddRole}>
                <i className="fa-solid fa-plus" /> 役職を追加
              </button>
            </div>

            <div className={styles.tableCard}>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>表示順</th>
                      <th>役職名</th>
                      <th style={{ width: "100px" }}>ID</th>
                      <th style={{ width: "120px", textAlign: "right" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((r) => (
                      <tr key={r.id}>
                        <td>{r.order ?? "-"}</td>
                        <td>
                          <strong>{r.name}</strong>
                        </td>
                        <td>
                          <code>{r.id}</code>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className={styles.actionButtons} style={{ justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className={styles.btnEdit}
                              onClick={() => handleOpenEditRole(r)}
                            >
                              編集
                            </button>
                            <button
                              type="button"
                              className={styles.btnDelete}
                              onClick={() => handleDeleteRole(r)}
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            タブ 5: ジャンルマスタ
            ======================================================== */}
        {activeTab === "genres" && (
          <div>
            <div className={styles.toolbar}>
              <div className={styles.titleArea}>
                <h2 className={styles.tabTitle}>ジャンルマスタ</h2>
                <span className={styles.itemCountBadge}>{genres.length}件</span>
              </div>
              <button type="button" className={styles.btnAddItem} onClick={handleOpenAddGenre}>
                <i className="fa-solid fa-plus" /> ジャンルを追加
              </button>
            </div>

            <div className={styles.tableCard}>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ジャンル名</th>
                      <th style={{ width: "150px" }}>ID</th>
                      <th style={{ width: "120px", textAlign: "right" }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {genres.map((g) => (
                      <tr key={g.id}>
                        <td>
                          <strong>{g.name}</strong>
                        </td>
                        <td>
                          <code>{g.id}</code>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className={styles.actionButtons} style={{ justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className={styles.btnEdit}
                              onClick={() => handleOpenEditGenre(g)}
                            >
                              編集
                            </button>
                            <button
                              type="button"
                              className={styles.btnDelete}
                              onClick={() => handleDeleteGenre(g)}
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            モーダル群
            ======================================================== */}

        {/* 楽器モーダル */}
        {instModalOpen && editingInst && (
          <div className={styles.modalOverlay} onClick={() => setInstModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>{isInstNew ? "楽器の追加" : "楽器の編集"}</h3>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setInstModalOpen(false)}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>楽器ID (英数字・記号)</label>
                  <input
                    type="text"
                    value={editingInst.id}
                    onChange={(e) => setEditingInst({ ...editingInst, id: e.target.value.trim() })}
                    placeholder="例: as, ts, tp, pf"
                    disabled={!isInstNew}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>楽器名</label>
                  <input
                    type="text"
                    value={editingInst.name}
                    onChange={(e) => setEditingInst({ ...editingInst, name: e.target.value })}
                    placeholder="例: Alto Sax"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>所属パート</label>
                  <select
                    value={editingInst.sectionId}
                    onChange={(e) => setEditingInst({ ...editingInst, sectionId: e.target.value })}
                    className={styles.input}
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>表示順 (数値が小さい順)</label>
                  <input
                    type="number"
                    value={editingInst.order ?? 10}
                    onChange={(e) =>
                      setEditingInst({ ...editingInst, order: Number(e.target.value) || 0 })
                    }
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setInstModalOpen(false)}
                >
                  キャンセル
                </button>
                <button type="button" className={styles.btnSubmit} onClick={handleSaveInst}>
                  保存する
                </button>
              </div>
            </div>
          </div>
        )}

        {/* セクションモーダル */}
        {secModalOpen && editingSec && (
          <div className={styles.modalOverlay} onClick={() => setSecModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>{isSecNew ? "パートの追加" : "パートの編集"}</h3>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setSecModalOpen(false)}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>パートID (半角数字など)</label>
                  <input
                    type="text"
                    value={editingSec.id}
                    onChange={(e) => setEditingSec({ ...editingSec, id: e.target.value.trim() })}
                    placeholder="例: 1, 2, 3"
                    disabled={!isSecNew}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>パート名</label>
                  <input
                    type="text"
                    value={editingSec.name}
                    onChange={(e) => setEditingSec({ ...editingSec, name: e.target.value })}
                    placeholder="例: サックス"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>テーマカラー (Hexコード)</label>
                  <input
                    type="color"
                    value={editingSec.color || "#0284c7"}
                    onChange={(e) => setEditingSec({ ...editingSec, color: e.target.value })}
                    style={{ width: "60px", height: "36px", cursor: "pointer" }}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>表示順 (数値が小さい順)</label>
                  <input
                    type="number"
                    value={editingSec.order ?? 10}
                    onChange={(e) =>
                      setEditingSec({ ...editingSec, order: Number(e.target.value) || 0 })
                    }
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setSecModalOpen(false)}
                >
                  キャンセル
                </button>
                <button type="button" className={styles.btnSubmit} onClick={handleSaveSec}>
                  保存する
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 役職モーダル */}
        {roleModalOpen && editingRole && (
          <div className={styles.modalOverlay} onClick={() => setRoleModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>{isRoleNew ? "役職の追加" : "役職の編集"}</h3>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setRoleModalOpen(false)}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>役職ID</label>
                  <input
                    type="text"
                    value={editingRole.id}
                    onChange={(e) => setEditingRole({ ...editingRole, id: e.target.value.trim() })}
                    placeholder="例: 1, 2, 3"
                    disabled={!isRoleNew}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>役職名</label>
                  <input
                    type="text"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    placeholder="例: バンマス, コンマス"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>表示順 (数値が小さい順)</label>
                  <input
                    type="number"
                    value={editingRole.order ?? 10}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, order: Number(e.target.value) || 0 })
                    }
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setRoleModalOpen(false)}
                >
                  キャンセル
                </button>
                <button type="button" className={styles.btnSubmit} onClick={handleSaveRole}>
                  保存する
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ジャンルモーダル */}
        {genreModalOpen && editingGenre && (
          <div className={styles.modalOverlay} onClick={() => setGenreModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>{isGenreNew ? "ジャンルの追加" : "ジャンルの編集"}</h3>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setGenreModalOpen(false)}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>ジャンルID</label>
                  <input
                    type="text"
                    value={editingGenre.id}
                    onChange={(e) =>
                      setEditingGenre({ ...editingGenre, id: e.target.value.trim() })
                    }
                    placeholder="例: swing, latin, funk"
                    disabled={!isGenreNew}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>ジャンル名</label>
                  <input
                    type="text"
                    value={editingGenre.name}
                    onChange={(e) => setEditingGenre({ ...editingGenre, name: e.target.value })}
                    placeholder="例: Swing, Latin"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setGenreModalOpen(false)}
                >
                  キャンセル
                </button>
                <button type="button" className={styles.btnSubmit} onClick={handleSaveGenre}>
                  保存する
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseLayout>
  );
}

