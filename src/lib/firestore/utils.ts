/**
 * FirebaseのDocumentSnapshotをプレーンなオブジェクトに変換する
 */
export const toPlainObject = (doc: any) => {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toMillis?.() || null,
    updatedAt: data.updatedAt?.toMillis?.() || null,
  };
};