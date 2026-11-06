import { Instrument, Section, InstrumentPart } from "./types";

/**
 * 初期セクション（パート）一覧
 */
export const DEFAULT_SECTIONS: Section[] = [
  { id: "1", name: "サックス", order: 1, color: "#d97706" },
  { id: "2", name: "トランペット", order: 2, color: "#dc2626" },
  { id: "3", name: "トロンボーン", order: 3, color: "#2563eb" },
  { id: "4", name: "リズム", order: 4, color: "#059669" },
];

/**
 * 初期楽器一覧
 */
export const DEFAULT_INSTRUMENTS: Instrument[] = [
  // サックス
  { id: "as", name: "Alto Sax", sectionId: "1", order: 1 },
  { id: "ts", name: "Tenor Sax", sectionId: "1", order: 2 },
  { id: "bs", name: "Baritone Sax", sectionId: "1", order: 3 },
  { id: "ss", name: "Soprano Sax", sectionId: "1", order: 4 },
  { id: "fl", name: "Flute", sectionId: "1", order: 5 },
  { id: "cl", name: "Clarinet", sectionId: "1", order: 6 },

  // トランペット
  { id: "tp", name: "Trumpet", sectionId: "2", order: 1 },
  { id: "flh", name: "Flugelhorn", sectionId: "2", order: 2 },

  // トロンボーン
  { id: "tb", name: "Trombone", sectionId: "3", order: 1 },
  { id: "btb", name: "Bass Trombone", sectionId: "3", order: 2 },

  // リズム
  { id: "pf", name: "Piano", sectionId: "4", order: 1 },
  { id: "gt", name: "Guitar", sectionId: "4", order: 2 },
  { id: "ba", name: "Bass", sectionId: "4", order: 3 },
  { id: "dr", name: "Drums", sectionId: "4", order: 4 },
  { id: "perc", name: "Percussion", sectionId: "4", order: 5 },
];

/**
 * ビッグバンド標準のデフォルト楽器構成（17パート）
 */
export const DEFAULT_INSTRUMENT_CONFIG: Record<string, InstrumentPart[]> = {
  // サックス (5)
  "1": [
    { partName: "A1", instrumentId: "as" },
    { partName: "A2", instrumentId: "as" },
    { partName: "T1", instrumentId: "ts" },
    { partName: "T2", instrumentId: "ts" },
    { partName: "B", instrumentId: "bs" },
  ],
  // トランペット (4)
  "2": [
    { partName: "1", instrumentId: "tp" },
    { partName: "2", instrumentId: "tp" },
    { partName: "3", instrumentId: "tp" },
    { partName: "4", instrumentId: "tp" },
  ],
  // トロンボーン (4)
  "3": [
    { partName: "1", instrumentId: "tb" },
    { partName: "2", instrumentId: "tb" },
    { partName: "3", instrumentId: "tb" },
    { partName: "4 (B)", instrumentId: "btb" },
  ],
  // リズム (4)
  "4": [
    { partName: "Pf", instrumentId: "pf" },
    { partName: "Gt", instrumentId: "gt" },
    { partName: "Ba", instrumentId: "ba" },
    { partName: "Dr", instrumentId: "dr" },
  ],
};

