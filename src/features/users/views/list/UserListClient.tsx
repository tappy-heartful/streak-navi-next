"use client";

import { ListBaseLayout } from "@/src/components/Layout/ListBaseLayout";
import { ListGroupContainer } from "@/src/components/Layout/ListGroupContainer";
import { SimpleTable } from "@/src/components/Table/SimpleTable";
import { User, Section, Role, Instrument, SecretWord } from "@/src/lib/firestore/types";
import { globalLineDefaultImage } from "@/src/lib/functions";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import styles from "./user-list.module.css";
import { Modal } from "@/src/components/Modal";

type Props = {
  initialData: {
    users: User[];
    sections: Section[];
    roles: Role[];
    instruments: Instrument[];
    secretWords: SecretWord[];
  };
};

export function UserListClient({ initialData }: Props) {
  const { users, sections, roles, instruments, secretWords } = initialData;
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 補助関数群
  const getRoleName = (roleId?: string) =>
    roles.find(r => r.id === roleId)?.name ?? "-";

  const getInstrumentNames = (instIds?: string[]) => {
    if (!instIds || instIds.length === 0) return "-";
    return instIds
      .map(id => instruments.find(i => i.id === id)?.name)
      .filter(Boolean)
      .join("\n");
  };

  const getAdminRoles = (user: User) => {
    const admins = secretWords
      .filter(sw => user[sw.roleField])
      .map(sw => sw.label);
    return admins.length > 0 ? admins.join("\n") : "-";
  };

  // ユーザをセクションごとにグループ化し、roleIdでソートする
  const usersBySection = useMemo(() => {
    const grouped: Record<string, User[]> = {};
    const unknownUsers: User[] = [];

    users.forEach(user => {
      const sectionId = user.sectionId;
      if (sectionId) {
        if (!grouped[sectionId]) grouped[sectionId] = [];
        grouped[sectionId].push(user);
      } else {
        unknownUsers.push(user);
      }
    });

    // 各グループ内で roleId 昇順でソート
    const sortFn = (a: User, b: User) => {
      const roleA = a.roleId || "";
      const roleB = b.roleId || "";
      return roleA.localeCompare(roleB, undefined, { numeric: true });
    };

    Object.values(grouped).forEach(group => group.sort(sortFn));
    unknownUsers.sort(sortFn);

    return { grouped, unknownUsers };
  }, [users]);

  // 倉敷ジャズストリート集計（出演者＝ミュージシャンID登録者 1人1,500円ノルマ・お客さん販売による相殺）
  const TICKET_PRICE = 1500;

  const { totalQuotaMembers, totalGuests, totalAmount, remainingQuota, isQuotaAchieved } = useMemo(() => {
    // ミュージシャンIDが登録されているユーザー数（出演者数＝ノルマ対象枚数）
    const quotaMembers = users.filter(
      u => u.kurashikiJazzMusicianId && u.kurashikiJazzMusicianId.trim() !== ""
    ).length;
    const guests = users.reduce((sum, u) => sum + (Number(u.kurashikiJazzGuestCount) || 0), 0);
    const amount = guests * TICKET_PRICE;
    const remaining = quotaMembers - guests;
    return {
      totalQuotaMembers: quotaMembers,
      totalGuests: guests,
      totalAmount: amount,
      remainingQuota: remaining,
      isQuotaAchieved: guests >= quotaMembers,
    };
  }, [users]);

  const totalQuotaAmount = totalQuotaMembers * TICKET_PRICE;
  const progressPercent = totalQuotaMembers > 0 ? Math.min(100, Math.round((totalGuests / totalQuotaMembers) * 100)) : 0;

  const getSectionStats = (sectionUsers: User[]) => {
    const quotaCount = sectionUsers.filter(
      u => u.kurashikiJazzMusicianId && u.kurashikiJazzMusicianId.trim() !== ""
    ).length;
    const guestCount = sectionUsers.reduce((sum, u) => sum + (Number(u.kurashikiJazzGuestCount) || 0), 0);
    return {
      quotaCount,
      guestCount,
      amount: guestCount * TICKET_PRICE,
    };
  };

  return (
    <ListBaseLayout
      title="ユーザ"
      icon="fa-solid fa-users"
      basePath="/user"
      count={users.length}
      hideAddButton={true}
    >
      {/* 倉敷ジャズストリート情報（ID・チケットノルマ相殺集計）一覧表示ボタン */}
      <div className={styles.idListButtonContainer}>
        <button type="button" className={styles.idListButton} onClick={() => setIsModalOpen(true)}>
          <i className="fa-solid fa-ticket" />
          2026年 倉敷ジャズスト（ID・チケット集計）
        </button>
      </div>

      {isModalOpen && (
        <Modal title="2026年 倉敷ジャズストリート チケット相殺・ID一覧" onClose={() => setIsModalOpen(false)}>
          {/* 運用方針・前提条件ガイドカード */}
          <div className={styles.guideCard}>
            <div className={styles.guideHeader}>
              <i className="fa-solid fa-circle-info" />
              <span>チケットノルマと運用方針について</span>
            </div>
            <div className={styles.guideContent}>
              <div className={styles.guideItem}>
                <span className={styles.guideBadge}>ノルマ</span>
                <span>出演者（ID登録者）1人につき<strong>1枚（1,500円）</strong>の購入ノルマあり（全体ノルマ: <strong>{totalQuotaMembers}枚 / ¥{totalQuotaAmount.toLocaleString()}</strong>）</span>
              </div>
              <div className={styles.guideItem}>
                <span className={styles.guideBadge}>観覧</span>
                <span>出演者パスでは他ステージは見られません。他バンドの演奏を見る場合はチケットが必要なため、<strong>ご自身が鑑賞する分（1枚）も回答人数（見込み枚数）に含めてカウントしてください。</strong></span>
              </div>
              <div className={styles.guideItem}>
                <span className={styles.guideBadge}>相殺</span>
                <span>他は見ない人のノルマ枠を、<strong>お客さんへの販売実績＋ご自身の観覧消化分でカバー・相殺</strong>します！</span>
              </div>
              <div className={styles.guideItem}>
                <span className={`${styles.guideBadge} ${styles.guideBadgeCash}`}>集金</span>
                <span>チケット代は<strong>なるべく現金</strong>でご用意ください。</span>
              </div>
            </div>
          </div>

          {/* ノルマ達成ダッシュボード */}
          <div className={styles.quotaDashboard}>
            <div className={styles.dashboardHeader}>
              <div className={styles.dashboardTitle}>
                <i className="fa-solid fa-chart-pie" />
                <span>ノルマ相殺・販売状況</span>
              </div>
              <span className={isQuotaAchieved ? styles.statusBadgeAchieved : styles.statusBadgeInProgress}>
                {isQuotaAchieved ? `🎉 全体ノルマ達成！ (+${Math.abs(remainingQuota)}枚)` : `あと ${remainingQuota}枚 で全員分カバー`}
              </span>
            </div>

            {/* 進捗バー */}
            <div className={styles.progressBarWrapper}>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className={styles.progressPercentText}>{progressPercent}%</span>
            </div>

            {/* 3指標サマリーグリッド */}
            <div className={styles.summaryGrid}>
              <div className={styles.summaryGridItem}>
                <span className={styles.gridLabel}>バンド全体ノルマ (ID登録者)</span>
                <span className={styles.gridValue}>
                  <strong>{totalQuotaMembers}</strong> 枚
                </span>
                <span className={styles.gridSubPrice}>¥{totalQuotaAmount.toLocaleString()}</span>
              </div>
              <div className={styles.gridDivider} />
              <div className={styles.summaryGridItem}>
                <span className={styles.gridLabel}>呼べるお客さん・自分観覧</span>
                <span className={`${styles.gridValue} ${styles.highlightBlue}`}>
                  <strong>{totalGuests}</strong> 枚
                </span>
                <span className={styles.gridSubPrice}>¥{totalAmount.toLocaleString()}</span>
              </div>
              <div className={styles.gridDivider} />
              <div className={styles.summaryGridItem}>
                <span className={styles.gridLabel}>相殺差引 (残り枠)</span>
                <span className={`${styles.gridValue} ${isQuotaAchieved ? styles.highlightGreen : styles.highlightOrange}`}>
                  <strong>{isQuotaAchieved ? `+${Math.abs(remainingQuota)}` : remainingQuota}</strong> 枚
                </span>
                <span className={styles.gridSubPrice}>
                  {isQuotaAchieved ? "カバー完了！" : `¥${(remainingQuota * TICKET_PRICE).toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {sections.map(section => {
            const sectionUsers = usersBySection.grouped[section.id];
            if (!sectionUsers || sectionUsers.length === 0) return null;
            const stats = getSectionStats(sectionUsers);

            return (
              <div key={section.id} className={styles.modalTableSection}>
                <h4 className={styles.modalSectionTitle}>
                  <span>{section.name}</span>
                  <span className={styles.sectionSubtotal}>
                    ノルマ: {stats.quotaCount}枚 / 販売・観覧見込み: {stats.guestCount}枚 (¥{stats.amount.toLocaleString()})
                  </span>
                </h4>
                <div className={styles.modalTableWrapper}>
                  <table className={styles.modalTable}>
                    <thead>
                      <tr>
                        <th>氏名 / ユーザー名</th>
                        <th>
                          呼べるお客さん人数
                          <span className={styles.headerSubText}>・自分鑑賞用</span>
                        </th>
                        <th>2026年 ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionUsers.map(u => {
                        const guestCount = Number(u.kurashikiJazzGuestCount) || 0;
                        return (
                          <tr key={u.id}>
                            <td>
                              <div className={styles.modalUserCell}>
                                <img
                                  src={u.pictureUrl || globalLineDefaultImage}
                                  alt="icon"
                                  className={styles.userThumb}
                                  onError={(e) => { (e.target as HTMLImageElement).src = globalLineDefaultImage; }}
                                />
                                <span>{u.realName || u.displayName || "名無し"}</span>
                              </div>
                            </td>
                            <td>
                              {guestCount > 0 ? (
                                <span className={styles.guestBadge}>
                                  <strong>{guestCount}</strong> 人
                                  <span className={styles.guestPrice}>
                                    (¥{(guestCount * TICKET_PRICE).toLocaleString()})
                                  </span>
                                </span>
                              ) : (
                                <span className={styles.noGuests}>0人</span>
                              )}
                            </td>
                            <td>
                              {u.kurashikiJazzMusicianId ? (
                                <span className={styles.musicianIdText}>{u.kurashikiJazzMusicianId}</span>
                              ) : (
                                <span className={styles.noIdText}>未設定</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* パート未設定ユーザー */}
          {usersBySection.unknownUsers.length > 0 && (() => {
            const unknownStats = getSectionStats(usersBySection.unknownUsers);
            return (
              <div className={styles.modalTableSection}>
                <h4 className={styles.modalSectionTitle}>
                  <span>❓未設定</span>
                  <span className={styles.sectionSubtotal}>
                    ノルマ: {unknownStats.quotaCount}枚 / 販売・観覧見込み: {unknownStats.guestCount}枚 (¥{unknownStats.amount.toLocaleString()})
                  </span>
                </h4>
                <div className={styles.modalTableWrapper}>
                  <table className={styles.modalTable}>
                    <thead>
                      <tr>
                        <th>氏名 / ユーザー名</th>
                        <th>
                          呼べるお客さん人数
                          <span className={styles.headerSubText}>・自分鑑賞用</span>
                        </th>
                        <th>2026年 ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersBySection.unknownUsers.map(u => {
                        const guestCount = Number(u.kurashikiJazzGuestCount) || 0;
                        return (
                          <tr key={u.id}>
                            <td>
                              <div className={styles.modalUserCell}>
                                <img
                                  src={u.pictureUrl || globalLineDefaultImage}
                                  alt="icon"
                                  className={styles.userThumb}
                                  onError={(e) => { (e.target as HTMLImageElement).src = globalLineDefaultImage; }}
                                />
                                <span>{u.realName || u.displayName || "名無し"}</span>
                              </div>
                            </td>
                            <td>
                              {guestCount > 0 ? (
                                <span className={styles.guestBadge}>
                                  <strong>{guestCount}</strong> 人
                                  <span className={styles.guestPrice}>
                                    (¥{(guestCount * TICKET_PRICE).toLocaleString()})
                                  </span>
                                </span>
                              ) : (
                                <span className={styles.noGuests}>0人</span>
                              )}
                            </td>
                            <td>
                              {u.kurashikiJazzMusicianId ? (
                                <span className={styles.musicianIdText}>{u.kurashikiJazzMusicianId}</span>
                              ) : (
                                <span className={styles.noIdText}>未設定</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* 事前手渡し・集金フッター注意文 */}
          <div className={styles.noticeFooterBox}>
            <p className={styles.noticeFooterText}>
              <i className="fa-solid fa-handshake-angle" style={{ marginRight: "6px", color: "#1976d2" }} />
              <strong>事前手渡しについて:</strong> チケットの事前手渡し方法（早めに来た人が会場前で渡すなど）は、全体の販売枚数が決まり次第、相談して決めましょう！
            </p>
            <p className={styles.noticeFooterText} style={{ marginTop: "4px" }}>
              <i className="fa-solid fa-coins" style={{ marginRight: "6px", color: "#d97706" }} />
              <strong>集金のお願い:</strong> チケット代（1人1,500円）はなるべく<strong>現金</strong>でご用意をお願いします。
            </p>
          </div>
        </Modal>
      )}

      {/* 登録されているセクション順に表示 */}
      {sections.map(section => {
        const sectionUsers = usersBySection.grouped[section.id];
        if (!sectionUsers || sectionUsers.length === 0) return null;

        return (
          <div key={section.id} className="container">
            <ListGroupContainer title={section.name}>
              <SimpleTable headers={["氏名", "略称", "楽器", "役職", "権限"]} hasData={true}>
                {sectionUsers.map(u => (
                  <tr key={u.id}>
                    <td className="list-table-row-header">
                      <Link prefetch={false} href={`/user/confirm?uid=${u.id}`} className={styles.userLink}>
                        <img
                          src={u.pictureUrl || globalLineDefaultImage}
                          alt="icon"
                          className={styles.userThumb}
                          onError={(e) => { (e.target as HTMLImageElement).src = globalLineDefaultImage; }}
                        />
                        <span className={styles.userNameText}>{u.displayName || "名無し"}</span>
                      </Link>
                    </td>
                    <td>{u.abbreviation || "-"}</td>
                    <td className={styles.textSmall}>{getInstrumentNames(u.instrumentIds)}</td>
                    <td>{getRoleName(u.roleId)}</td>
                    <td className={styles.textSmall}>{getAdminRoles(u)}</td>
                  </tr>
                ))}
              </SimpleTable>
            </ListGroupContainer>
          </div>
        );
      })}

      {/* パート未設定ユーザー */}
      {usersBySection.unknownUsers.length > 0 && (
        <div className="container">
          <ListGroupContainer title="❓未設定" titleStyle={{ borderColor: "#ff9800" }}>
            <SimpleTable headers={["氏名", "略称", "楽器",  "役職", "権限"]} hasData={true}>
              {usersBySection.unknownUsers.map(u => (
                <tr key={u.id}>
                  <td className="list-table-row-header">
                    <Link prefetch={false} href={`/user/confirm?uid=${u.id}`} className={styles.userLink}>
                      <img
                        src={u.pictureUrl || globalLineDefaultImage}
                        alt="icon"
                        className={styles.userThumb}
                        onError={(e) => { (e.target as HTMLImageElement).src = globalLineDefaultImage; }}
                      />
                      <span className={styles.userNameText}>{u.displayName || "名無し"}</span>
                    </Link>
                  </td>
                  <td>{u.abbreviation || "-"}</td>
                  <td className={styles.textSmall}>{getInstrumentNames(u.instrumentIds)}</td>
                  <td>{getRoleName(u.roleId)}</td>
                  <td className={styles.textSmall}>{getAdminRoles(u)}</td>
                </tr>
              ))}
            </SimpleTable>
          </ListGroupContainer>
        </div>
      )}
    </ListBaseLayout>
  );
}
