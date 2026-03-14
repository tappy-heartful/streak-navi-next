export interface Announcement {
  type: "pending" | "item" | "empty";
  message?: string;
  link?: string;
  label?: string;
}

export interface Score {
  id: string;
  title: string;
  abbreviation?: string;
  note?: string;
  scoreUrl?: string;
  genres?: string[];
  referenceTrack?: string;
  youtubeId?: string;
  isDispTop?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface BlueNote {
  id: string;
  title?: string;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: any;
}

export interface Media {
  id: string;
  title: string;
  date: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  driveUrl?: string;
  isDispTop?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export type Genre = {
  id: string;
  name: string;
};

export interface User {
  id: string;
  displayName?: string;
  pictureUrl?: string;
  sectionId?: string;
  roleId?: string;
  instrumentIds?: string[];
  abbreviation?: string;
  paypayId?: string;
  agreedAt?: number;
  lastLoginAt?: number;
  createdAt?: number;
  updatedAt?: number;
  isSystemAdmin?: boolean;
  [key: string]: any; // 動的フラグ (e.g. isScoreAdmin)
}

export interface Section {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
}

export interface Instrument {
  id: string;
  name: string;
  sectionId: string;
}

export interface SecretWord {
  id: string;
  label: string;
  roleField: string;
  word?: string;
}

export interface EventWithSetlist {
  id: string;
  title: string;
  date: string;
  scoreIdsInSetlist: string[];
}

export interface Prefecture {
  id: string;
  name: string;
  order?: number;
}

export interface Studio {
  id: string;
  prefecture?: string;
  name: string;
  hp?: string;
  map?: string;
  availabilityInfo?: string;
  fee?: string;
  rooms?: string[];
  roomsUrl?: string;
  tel?: string;
  reserve?: string;
  access?: string;
  note?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Call {
  id: string;
  title: string;
  description?: string;
  acceptStartDate: string;  // "yyyy.MM.dd"
  acceptEndDate: string;    // "yyyy.MM.dd"
  items: string[];          // 募集ジャンル一覧
  isAnonymous?: boolean;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
}

export type CallAnswerSong = {
  title: string;
  url?: string;
  scorestatus?: string;
  purchase?: string;
  note?: string;
};

export interface CallAnswer {
  id: string;
  uid: string;
  answers: { [genre: string]: CallAnswerSong[] };
}

export interface ScoreStatus {
  id: string;
  name: string;
}

export interface Board {
  id: string;
  title: string;
  content: string;
  sectionId: string | null;
  files?: { name: string; url: string; path: string }[];
  createdBy?: string;
  createdByName?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface VoteChoice {
  name: string;
  link?: string;
}

export interface VoteItem {
  name: string;
  link?: string;
  choices: VoteChoice[];
}

export interface Vote {
  id: string;
  name: string;
  description: string;
  descriptionLink?: string;
  acceptStartDate: string;
  acceptEndDate: string;
  isAnonymous?: boolean;
  hideVotes?: boolean;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
  items: VoteItem[];
}

export interface VoteAnswer {
  id: string;
  voteId: string;
  uid: string;
  answers: Record<string, string | null>;
  updatedAt?: number;
}

// ===== イベント =====

export interface SetlistGroup {
  title: string;
  songIds: string[];
}

export interface InstrumentPart {
  partName: string;
  instrumentId?: string;
}

export interface Event {
  id: string;
  title: string;
  attendanceType: "schedule" | "attendance";
  date?: string;              // "yyyy.MM.dd" (出欠タイプ)
  candidateDates?: string[];  // "yyyy.MM.dd"[] (日程調整タイプ)
  acceptStartDate: string;
  acceptEndDate: string;
  placeName?: string;
  website?: string;
  access?: string;
  googleMap?: string;
  schedule?: string;
  dress?: string;
  bring?: string;
  rent?: string;
  other?: string;
  allowAssign?: boolean;
  setlist?: SetlistGroup[];
  instrumentConfig?: Record<string, InstrumentPart[]>;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface EventAttendanceAnswer {
  id: string;
  eventId: string;
  uid: string;
  status: string;
  updatedAt?: number;
}

export interface EventAdjustAnswer {
  id: string;
  eventId: string;
  uid: string;
  answers: Record<string, string>; // { "yyyy.MM.dd": statusId }
  updatedAt?: number;
}

export interface AttendanceStatus {
  id: string;
  name: string;
}

export interface EventAdjustStatus {
  id: string;
  name: string;
}

export interface EventRecording {
  id: string;
  eventId: string;
  uid: string;
  title: string;
  url: string;
  createdAt?: number;
}

// ===== ライブ =====

export interface Live {
  id: string;
  title: string;
  date: string;              // "yyyy.MM.dd"
  open?: string;             // "HH:mm" 開場時間
  start?: string;            // "HH:mm" 開演時間
  venue?: string;
  venueUrl?: string;
  venueGoogleMap?: string;
  advance?: number;          // 前売料金
  door?: number;             // 当日料金
  flyerUrl?: string;
  isAcceptReserve?: boolean;
  acceptStartDate?: string;  // "yyyy.MM.dd"
  acceptEndDate?: string;    // "yyyy.MM.dd"
  ticketStock?: number;
  totalReserved?: number;    // 予約済み数（集計値）
  maxCompanions?: number;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface LiveCheckIn {
  id: string;
  liveId: string;
  type: string; // "door" = 当日受付, その他 = 予約来場
  createdAt?: number;
}

export interface EnqueteQuestion {
  id: string;
  label: string;
  type: "rating" | "radio" | "textarea" | "text";
  options?: string[];
}

export interface EnqueteAnswer {
  id: string;
  liveId: string;
  common: Record<string, string | number>;
}
