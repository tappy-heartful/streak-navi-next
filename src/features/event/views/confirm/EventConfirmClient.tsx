"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/src/components/Layout/BaseLayout";
import { AnswerConfirmLayout } from "@/src/components/Layout/AnswerConfirmLayout";
import { DisplayField } from "@/src/components/Form/DisplayField";
import { Modal } from "@/src/components/Modal";
import {
  Event,
  EventAttendanceAnswer,
  EventAdjustAnswer,
  EventRecording,
  User,
} from "@/src/lib/firestore/types";
import { EventConfirmData } from "@/src/features/event/api/event-server-actions";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  isInTerm,
  getDayOfWeek,
  showDialog,
  showSpinner,
  hideSpinner,
  globalLineDefaultImage,
  extractYouTubeId,
} from "@/src/lib/functions";
import {
  deleteEventWithAnswers,
  deleteMyAttendanceAnswer,
  deleteMyAdjustAnswer,
  addRecording,
  deleteRecording,
} from "@/src/features/event/api/event-client-service";

type Props = {
  eventId: string;
  data: EventConfirmData;
};

function isEventPast(event: Event): boolean {
  if (!event.date) return false;
  const parts = event.date.split(".");
  if (parts.length !== 3) return false;
  const [y, m, d] = parts.map(Number);
  const eventDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate < today;
}

export function EventConfirmClient({ eventId, data }: Props) {
  const router = useRouter();
  const { userData, isAdmin } = useAuth();
  const uid = userData?.id;

  const { event, answers, usersMap, sectionsMap, scoresMap, attendanceStatuses, adjustStatuses, recordings: initialRecordings, allUserUids } = data;

  const [recordings, setRecordings] = useState<EventRecording[]>(initialRecordings);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [recordingForm, setRecordingForm] = useState({ title: "", url: "" });
  const [recordingModalOpen, setRecordingModalOpen] = useState(false);

  const isSchedule = event.attendanceType === "schedule";
  const isPast = isEventPast(event);
  const inTerm = isInTerm(event.acceptStartDate, event.acceptEndDate);
  const isActive = !isPast && inTerm;

  const myAnswerExists = answers.some(a => a.uid === uid);

  let answerStatus: "answered" | "pending" | "closed";
  let answerStatusText: string;
  if (isPast) {
    answerStatus = "closed";
    answerStatusText = "終了";
  } else if (!inTerm) {
    answerStatus = "closed";
    answerStatusText = "回答を受け付けてません";
  } else if (myAnswerExists) {
    answerStatus = "answered";
    answerStatusText = "回答済";
  } else {
    answerStatus = "pending";
    answerStatusText = "未回答";
  }

  const answeredUids = answers.map(a => a.uid);
  const unansweredUids = allUserUids.filter(u => !answeredUids.includes(u));

  // ---- Handlers ----

  const handleDelete = async () => {
    const confirmed = await showDialog("イベントと全員の回答を削除しますか？\nこの操作は元に戻せません");
    if (!confirmed) return;
    const confirmed2 = await showDialog("本当に削除しますか？");
    if (!confirmed2) return;

    showSpinner();
    try {
      await deleteEventWithAnswers(eventId);
      hideSpinner();
      await showDialog("削除しました", true);
      showSpinner();
      router.push("/event");
    } catch {
      hideSpinner();
      await showDialog("削除に失敗しました", true);
    }
  };

  const handleDeleteMyAnswer = async () => {
    if (!uid) return;
    const confirmed = await showDialog("自分の回答を取り消しますか？");
    if (!confirmed) return;

    showSpinner();
    try {
      if (isSchedule) {
        await deleteMyAdjustAnswer(eventId, uid);
      } else {
        await deleteMyAttendanceAnswer(eventId, uid);
      }
      hideSpinner();
      await showDialog("回答を取り消しました", true);
      showSpinner();
      router.refresh();
    } catch {
      hideSpinner();
      await showDialog("削除に失敗しました", true);
    }
  };

  const handleAddRecording = () => {
    setRecordingForm({ title: "", url: "" });
    setRecordingModalOpen(true);
  };

  const handleSaveRecording = async () => {
    if (!uid) return;
    if (!recordingForm.title || !recordingForm.url) {
      await showDialog("タイトルとURLは必須です", true);
      return;
    }
    setRecordingModalOpen(false);
    showSpinner();
    try {
      const newRec = await addRecording(eventId, uid, recordingForm.title, recordingForm.url);
      hideSpinner();
      await showDialog("リンクを追加しました", true);
      setRecordings(prev => [...prev, newRec]);
    } catch {
      hideSpinner();
      await showDialog("追加に失敗しました", true);
    }
  };

  const handleDeleteRecording = async (rec: EventRecording) => {
    if (!uid) return;
    if (!isAdmin && rec.uid !== uid) {
      await showDialog("このリンクを削除する権限がありません", true);
      return;
    }
    const confirmed = await showDialog(`リンク「${rec.title}」を削除しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteRecording(rec.id);
      hideSpinner();
      await showDialog("リンクを削除しました", true);
      setRecordings(prev => prev.filter(r => r.id !== rec.id));
    } catch {
      hideSpinner();
      await showDialog("削除に失敗しました", true);
    }
  };

  // ---- Modal helpers ----

  const showUsersModal = (title: string, uids: string[]) => {
    const grouped: Record<string, User[]> = {};
    uids.forEach(u => {
      const user = usersMap[u];
      const sectionId = user?.sectionId || "unknown";
      if (!grouped[sectionId]) grouped[sectionId] = [];
      grouped[sectionId].push(user || { id: u, displayName: "退会済みユーザ", pictureUrl: "" });
    });

    const sortedSectionIds = Object.keys(sectionsMap).sort().filter(sid => grouped[sid]);
    const unknownIds = ["unknown"].filter(id => grouped[id]);

    const content = (
      <div>
        {[...sortedSectionIds, ...unknownIds].map(sectionId => {
          const users = grouped[sectionId];
          if (!users) return null;
          const sectionName = sectionsMap[sectionId] || "❓未設定";
          return (
            <div key={sectionId} className="attendance-section-group">
              <h4>{sectionName}</h4>
              <div className="attendance-users">
                {users.map((u, i) => (
                  <div key={u.id || i} className="attendance-user small-user">
                    <img
                      src={u.pictureUrl || globalLineDefaultImage}
                      alt={u.displayName || ""}
                      onError={(e) => { e.currentTarget.src = globalLineDefaultImage; }}
                    />
                    <span>{u.displayName || "退会済み"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {uids.length === 0 && <p className="no-user">該当者はいません</p>}
      </div>
    );
    setModalTitle(title);
    setModalContent(content);
    setModalOpen(true);
  };

  // ---- Setlist + YouTube playlist ----

  const buildSetlistContent = () => {
    const setlist = event.setlist || [];
    if (setlist.length === 0) return { html: "設定されていません", playlistUrl: null };

    const watchIds: string[] = [];
    const groups = setlist.map(group => {
      const songs = (group.songIds || []).map(id => {
        const score = scoresMap[id];
        if (!score) return { id, title: "曲名が見つかりません", scoreUrl: undefined, videoId: undefined };
        if (score.referenceTrack) {
          const vid = extractYouTubeId(score.referenceTrack);
          if (vid && !watchIds.includes(vid)) watchIds.push(vid);
        }
        return { id, title: score.title, scoreUrl: score.scoreUrl };
      });
      return { title: group.title, songs };
    });

    const playlistUrl = watchIds.length > 0
      ? `https://www.youtube.com/watch_videos?video_ids=${watchIds.join(",")}`
      : null;

    return { groups, playlistUrl };
  };

  const { groups: setlistGroups, playlistUrl } = (() => {
    const result = buildSetlistContent();
    if ("html" in result) return { groups: null, playlistUrl: null };
    return result;
  })();

  // ---- Adjust table (schedule type) ----

  const renderAdjustTable = () => {
    const candidateDates = event.candidateDates || [];
    const adjustAnswers = answers as EventAdjustAnswer[];

    const dateCounts: Record<string, Record<string, number>> = {};
    adjustAnswers.forEach(ans => {
      Object.entries(ans.answers || {}).forEach(([date, statusId]) => {
        if (!dateCounts[date]) dateCounts[date] = {};
        dateCounts[date][statusId] = (dateCounts[date][statusId] || 0) + 1;
      });
    });

    return (
      <div className="adjust-table">
        <div className="adjust-row header-row">
          <div className="date-cell">日程</div>
          <div className="status-summary-cell">回答</div>
        </div>
        {candidateDates.map(date => {
          const parts = date.split(".");
          const monthDay = parts.length === 3 ? `${parts[1]}/${parts[2]}` : date;
          const dayStr = getDayOfWeek(date, true);
          const counts = dateCounts[date] || {};

          return (
            <div key={date} className="adjust-row">
              <div className="date-cell">
                <span className="date-part">{monthDay}</span>
                <span className="day-part">({dayStr})</span>
              </div>
              <div className="status-summary-cell">
                {adjustStatuses.map(status => {
                  const count = counts[status.id] || 0;
                  return count > 0 ? (
                    <a
                      key={status.id}
                      href="#"
                      className={`status-count status-${status.name}`}
                      onClick={e => {
                        e.preventDefault();
                        const uids = adjustAnswers
                          .filter(a => (a.answers || {})[date] === status.id)
                          .map(a => a.uid);
                        const [, m, d] = date.split(".");
                        showUsersModal(`${m}/${d}(${dayStr}) ${status.name}の人`, uids);
                      }}
                    >
                      {status.name}{count}
                    </a>
                  ) : (
                    <span key={status.id} className={`status-count status-count-zero status-${status.name}`}>
                      {status.name}{count}
                    </span>
                  );
                })}
                {unansweredUids.length > 0 ? (
                  <a
                    href="#"
                    className="status-count status-unanswered"
                    onClick={e => {
                      e.preventDefault();
                      const [, m, d] = date.split(".");
                      showUsersModal(`${m}/${d}(${dayStr}) 未回答の人`, unansweredUids);
                    }}
                  >
                    未{unansweredUids.length}
                  </a>
                ) : (
                  <span className="status-count status-count-zero status-unanswered">
                    未{unansweredUids.length}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ---- Attendance blocks (attendance type) ----

  const renderAttendanceBlocks = () => {
    const attAnswers = answers as EventAttendanceAnswer[];
    return (
      <>
        {attendanceStatuses.map(status => {
          const filtered = attAnswers.filter(a => a.status === status.id);
          const grouped: Record<string, User[]> = {};
          filtered.forEach(a => {
            const user = usersMap[a.uid];
            const sectionId = user?.sectionId || "unknown";
            if (!grouped[sectionId]) grouped[sectionId] = [];
            grouped[sectionId].push(user || { id: a.uid, displayName: "退会済みユーザ", pictureUrl: "" });
          });

          const sortedSections = Object.keys(sectionsMap).sort().filter(sid => grouped[sid]);

          return (
            <div key={status.id} className="attendance-status-block">
              <h3>{status.name}{filtered.length > 0 ? ` (${filtered.length}人)` : ""}</h3>
              <div className="status-content">
                {filtered.length === 0 ? (
                  <p className="no-user">該当者なし</p>
                ) : (
                  sortedSections.map(sectionId => {
                    const users = grouped[sectionId];
                    if (!users) return null;
                    const sectionName = sectionsMap[sectionId] || "❓未設定";
                    return (
                      <div key={sectionId} className="attendance-section-group">
                        <h4>{sectionName} ({users.length}人)</h4>
                        <div className="attendance-users">
                          {users.map((u, i) => (
                            <div key={u.id || i} className="attendance-user small-user">
                              <img
                                src={u.pictureUrl || globalLineDefaultImage}
                                alt={u.displayName || ""}
                                onError={(e) => { e.currentTarget.src = globalLineDefaultImage; }}
                              />
                              <span>{u.displayName || "退会済み"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
        {unansweredUids.length > 0 && (
          <button
            id="unanswered-button"
            onClick={() => showUsersModal("出欠 未回答者", unansweredUids)}
          >
            未回答者を見る
          </button>
        )}
      </>
    );
  };

  // ---- Answer menu slot ----

  const answerMenuSlot = (
    <>
      <button
        type="button"
        className="save-button"
        onClick={() => {
          showSpinner();
          const path = isSchedule
            ? `/event/adjust-answer?eventId=${eventId}`
            : `/event/attendance-answer?eventId=${eventId}`;
          router.push(path);
        }}
      >
        {myAnswerExists ? "回答を修正する" : "回答する"}
      </button>
      {myAnswerExists && (
        <button type="button" className="delete-button" onClick={handleDeleteMyAnswer}>
          回答を取り消す
        </button>
      )}
    </>
  );

  return (
    <BaseLayout>
      <AnswerConfirmLayout
        name="イベント"
        basePath="/event"
        dataId={eventId}
        featureIdKey="eventId"
        answerStatus={answerStatus}
        answerStatusText={answerStatusText}
        isActive={isActive}
        onDelete={handleDelete}
        answerMenuSlot={answerMenuSlot}
      >
        {/* 日付 */}
        <div className="form-group">
          <label className="label-title">
            {isSchedule ? "候補日" : "日付"}
          </label>
          <div className="label-value">
            {isSchedule ? (
              <div>
                {(event.candidateDates || []).map(d => (
                  <div key={d}>{getDayOfWeek(d)}</div>
                ))}
              </div>
            ) : (
              <span>{event.date ? getDayOfWeek(event.date) : "未設定"}</span>
            )}
          </div>
        </div>

        {/* 受付期間 */}
        <DisplayField label={isSchedule ? "日程調整受付期間" : "出欠受付期間"}>
          {event.acceptStartDate || event.acceptEndDate
            ? `${getDayOfWeek(event.acceptStartDate)} ～ ${getDayOfWeek(event.acceptEndDate)}`
            : "未設定"}
        </DisplayField>

        {/* タイトル */}
        <DisplayField label="タイトル">{event.title}</DisplayField>

        {/* 場所 */}
        <div className="form-group">
          <label className="label-title">場所</label>
          <div className="label-value">
            {event.website ? (
              <a href={event.website} target="_blank" rel="noopener noreferrer">
                {event.placeName || event.website}
              </a>
            ) : (
              event.placeName || "未設定"
            )}
          </div>
        </div>

        {/* 交通アクセス */}
        <div className="form-group">
          <label className="label-title">交通アクセス・駐車場情報</label>
          <div className="label-value">
            {event.access ? (
              /^https?:\/\//.test(event.access) ? (
                <a href={event.access} target="_blank" rel="noopener noreferrer">{event.access}</a>
              ) : (
                <span style={{ whiteSpace: "pre-wrap" }}>{event.access}</span>
              )
            ) : (
              "未設定"
            )}
          </div>
        </div>

        {/* Google Map */}
        <div className="form-group">
          <label className="label-title">Google Map</label>
          <div className="label-value">
            {event.googleMap ? (
              <a href={event.googleMap} target="_blank" rel="noopener noreferrer">Google Mapで見る</a>
            ) : (
              "未設定"
            )}
          </div>
        </div>

        {/* やる曲 */}
        <div className="form-group">
          <div className="score-header">
            <label className="label-title">やる曲</label>
            {playlistUrl && (
              <a href={playlistUrl} target="_blank" rel="noopener noreferrer" className="playlist-button">
                参考音源プレイリスト
              </a>
            )}
          </div>
          <div className="label-value">
            {setlistGroups && setlistGroups.length > 0 ? (
              setlistGroups.map((group, i) => (
                <div key={i} className="setlist-group-confirm">
                  {group.title && <h4>{group.title}</h4>}
                  <div className="setlist-songs">
                    {group.songs.map((song, j) => (
                      <div key={j}>
                        {song.scoreUrl ? (
                          <a href={song.scoreUrl} target="_blank" rel="noopener noreferrer">{song.title}</a>
                        ) : (
                          song.title
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              "設定されていません"
            )}
          </div>
        </div>

        {/* 譜割 */}
        {event.allowAssign && (
          <div className="form-group">
            <label className="label-title">譜割</label>
            <div className="label-value">
              <a href={`/assign-confirm?eventId=${eventId}`} target="_blank" rel="noopener noreferrer">
                譜割りを見る
              </a>
            </div>
          </div>
        )}

        {/* タイムスケジュール */}
        <DisplayField label="タイムスケジュール" preWrap>{event.schedule || ""}</DisplayField>

        {/* 服装 */}
        <DisplayField label="服装" preWrap>{event.dress || ""}</DisplayField>

        {/* 回答状況 */}
        <div className="form-group">
          <label className="label-title">{isSchedule ? "日程調整" : "出欠"}</label>
          <div>
            <span className="answer-count-summary">
              回答{answers.length}人 (未回答{unansweredUids.length}人)
            </span>
            {isSchedule ? renderAdjustTable() : renderAttendanceBlocks()}
          </div>
        </div>

        {/* 録音・録画リンク */}
        <div className="form-group">
          <label className="label-title">録音・録画リンク</label>
          <div id="event-recordings-container">
            {recordings.length === 0 ? (
              <p className="no-user">登録されたリンクはありません。</p>
            ) : (
              <ul className="recording-list-ul">
                {recordings.map(rec => {
                  const registeredUser = usersMap[rec.uid]?.displayName || "退会済み";
                  const canDelete = isAdmin || rec.uid === uid;
                  return (
                    <li key={rec.id}>
                      <a href={rec.url} target="_blank" rel="noopener noreferrer" className="recording-link">
                        {rec.title}
                      </a>
                      <span className="registered-by">by {registeredUser}</span>
                      {canDelete && (
                        <button
                          className="delete-recording-btn"
                          onClick={() => handleDeleteRecording(rec)}
                        >
                          🗑
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <button className="add-recording-button" onClick={handleAddRecording}>
              ＋ リンクを追加
            </button>
          </div>
        </div>

        {/* 個人で持ってくるもの */}
        <DisplayField label="個人で持ってくるもの" preWrap>{event.bring || ""}</DisplayField>

        {/* 施設に借りるもの */}
        <DisplayField label="施設に借りるもの" preWrap>{event.rent || ""}</DisplayField>

        {/* 楽器構成 */}
        <div className="form-group">
          <label className="label-title">楽器構成</label>
          <div className="label-value">
            {event.instrumentConfig && Object.keys(event.instrumentConfig).length > 0 ? (
              Object.keys(event.instrumentConfig)
                .sort((a, b) => Number(a) - Number(b))
                .map(sectionId => {
                  const parts = event.instrumentConfig![sectionId];
                  const sectionName = sectionsMap[sectionId];
                  const partNames = parts.map(p => p.partName).filter(Boolean).join("、");
                  if (!sectionName || !partNames) return null;
                  return (
                    <div key={sectionId} style={{ marginBottom: "8px" }}>
                      <strong>{sectionName}</strong>
                      <br />
                      {partNames}
                    </div>
                  );
                })
            ) : (
              "未設定"
            )}
          </div>
        </div>

        {/* その他 */}
        <DisplayField label="その他" preWrap>{event.other || ""}</DisplayField>

        {modalOpen && (
          <Modal title={modalTitle} onClose={() => setModalOpen(false)}>
            {modalContent}
          </Modal>
        )}

        {recordingModalOpen && (
          <Modal title="録音・録画リンクの登録" onClose={() => setRecordingModalOpen(false)}>
            <div className="form-group">
              <label className="label-title">タイトル *</label>
              <input
                type="text"
                className="form-control"
                placeholder="例: 練習/ライブ 通し録音"
                value={recordingForm.title}
                onChange={e => setRecordingForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="label-title">URL *</label>
              <input
                type="text"
                className="form-control"
                placeholder="https://youtube.com/..."
                value={recordingForm.url}
                onChange={e => setRecordingForm(f => ({ ...f, url: e.target.value }))}
              />
            </div>
            <p style={{ fontSize: "0.85em", color: "#666", marginTop: "8px" }}>
              ※ YouTube, Google Drive, Dropboxなどの公開リンクを登録してください。
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button type="button" className="save-button" onClick={handleSaveRecording}>登録</button>
              <button type="button" className="back-link" onClick={() => setRecordingModalOpen(false)}>キャンセル</button>
            </div>
          </Modal>
        )}
      </AnswerConfirmLayout>
    </BaseLayout>
  );
}
