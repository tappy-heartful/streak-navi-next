import { db } from "@/src/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { Board } from "@/src/lib/firestore/types";
import { getSession } from "@/src/lib/functions";

export type BoardFormData = {
  title: string;
  content: string;
  sectionId: string | null;
  files: { name: string; url: string; path: string }[];
};

export const saveBoard = async (
  mode: "new" | "edit" | "copy",
  data: BoardFormData,
  boardId?: string
): Promise<string> => {
  const uid = getSession("uid") || "anonymous";
  const displayName = getSession("displayName") || "匿名";

  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (mode === "edit" && boardId) {
    const boardRef = doc(db, "boards", boardId);
    await updateDoc(boardRef, payload);
    return boardId;
  } else {
    const docRef = await addDoc(collection(db, "boards"), {
      ...payload,
      createdBy: uid,
      createdByName: displayName,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }
};

export const deleteBoard = async (boardId: string) => {
  await deleteDoc(doc(db, "boards", boardId));
};
