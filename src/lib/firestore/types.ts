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