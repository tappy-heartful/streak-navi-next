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

export interface Board {
  id: string;
  title: string;
  content: string;
  sectionId: string | null;
  files?: { name: string; url: string; path: string }[];
  createdBy?: string;
  createdByName?: string;
  createdAt?: any; // Firestore Timestamp or number
  updatedAt?: any;
}