import { Instrument, Section, InstrumentPart } from "./types";

/**
 * 初期セクション（パート）一覧
 */
export const DEFAULT_SECTIONS: Section[] = [
  { id: "1", name: "🎷サックス", order: 1, color: "#d97706" },
  { id: "2", name: "📯トロンボーン", order: 3, color: "#2563eb" },
  { id: "3", name: "🎺トランペット", order: 2, color: "#dc2626" },
  { id: "4", name: "🥁リズム", order: 4, color: "#059669" },
  { id: "5", name: "✨その他", order: 4, color: "#6601e0ff" },
];

/**
 * 初期楽器一覧
 */
export const DEFAULT_INSTRUMENTS: Instrument[] = [
  // サックス
  { id: "101", name: "アルトサックス", sectionId: "1", order: 1 },
  { id: "102", name: "テナーサックス", sectionId: "1", order: 2 },
  { id: "103", name: "バリトンサックス", sectionId: "1", order: 3 },
  { id: "104", name: "フルート", sectionId: "1", order: 4 },
  { id: "105", name: "ソプラノサックス", sectionId: "1", order: 5 },

  // トロンボーン
  { id: "201", name: "トロンボーン", sectionId: "2", order: 1 },
  { id: "202", name: "バストロンボーン", sectionId: "2", order: 2 },

  // トランペット
  { id: "301", name: "トランペット", sectionId: "3", order: 1 },
  { id: "302", name: "フリューゲルホルン", sectionId: "3", order: 2 },

  // リズム
  { id: "4011", name: "ギター", sectionId: "4", order: 1 },
  { id: "4021", name: "ピアノ", sectionId: "4", order: 2 },
  { id: "4031", name: "ベース", sectionId: "4", order: 3 },
  { id: "4041", name: "ドラム", sectionId: "4", order: 4 },

  // その他
  { id: "501", name: "ボーカル", sectionId: "4", order: 1 },
];

/**
 * ビッグバンド標準のデフォルト楽器構成（17パート）
 */
export const DEFAULT_INSTRUMENT_CONFIG: Record<string, InstrumentPart[]> = {
  // サックス (5)
  "1": [
    { partName: "As1", instrumentId: "101" },
    { partName: "As2", instrumentId: "101" },
    { partName: "Ts1", instrumentId: "102" },
    { partName: "Ts2", instrumentId: "102" },
    { partName: "Bs", instrumentId: "103" },
  ],
  // トロンボーン (4)
  "2": [
    { partName: "Tb1", instrumentId: "201" },
    { partName: "Tb2", instrumentId: "201" },
    { partName: "Tb3", instrumentId: "201" },
    { partName: "Tb4", instrumentId: "201" },
  ],
  // トランペット (4)
  "3": [
    { partName: "Tp1", instrumentId: "301" },
    { partName: "Tp2", instrumentId: "301" },
    { partName: "Tp3", instrumentId: "301" },
    { partName: "Tp4", instrumentId: "301" },
  ],
  // リズム (4)
  "4": [
    { partName: "Gt", instrumentId: "4011" },
    { partName: "Pf", instrumentId: "4021" },
    { partName: "Ba", instrumentId: "4031" },
    { partName: "Drs", instrumentId: "4041" },
  ],
};

