/**
 * FirebaseのDocumentSnapshotをプレーンなオブジェクトに変換する
 * （doc.data() をすでに呼んだプレーンオブジェクトが渡された場合にも安全に対応）
 */
export const toPlainObject = (doc: any) => {
  if (!doc) return doc;
  const data = typeof doc.data === "function" ? doc.data() : doc;
  const obj = { ...data, ...(doc.id ? { id: doc.id } : {}) };
  
  // 再帰的にTimestampをミリ秒(number)に変換する
  const convertTimestamps = (item: any): any => {
    if (!item || typeof item !== "object") return item;
    
    // Firestore Timestamp or Date object
    if (typeof item.toMillis === "function") {
      return item.toMillis();
    }
    if (item instanceof Date) {
      return item.getTime();
    }
    
    if (Array.isArray(item)) {
      return item.map(convertTimestamps);
    }
    
    const result: any = {};
    for (const key in item) {
      result[key] = convertTimestamps(item[key]);
    }
    return result;
  };

  return convertTimestamps(obj);
};