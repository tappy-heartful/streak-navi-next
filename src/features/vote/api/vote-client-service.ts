import { db } from "@/src/lib/firebase";
import { Vote, VoteAnswer } from "@/src/lib/firestore/types";
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { archiveAndDeleteDoc } from "@/src/lib/functions";

export async function addVote(voteData: Omit<Vote, "id">): Promise<string> {
  const voteRef = doc(collection(db, "votes"));
  await setDoc(voteRef, {
    ...voteData,
    createdAt: serverTimestamp(),
  });
  return voteRef.id;
}

export async function updateVote(voteId: string, updates: Partial<Vote>): Promise<void> {
  const voteRef = doc(db, "votes", voteId);
  await updateDoc(voteRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteVoteWithAnswers(voteId: string): Promise<void> {
  // Archive and delete the vote
  await archiveAndDeleteDoc("votes", voteId);

  // Archive and delete associated answers
  const answersRef = collection(db, "voteAnswers");
  const snap = await getDocs(answersRef);
  
  for (const answerDoc of snap.docs) {
    if (answerDoc.id.startsWith(`${voteId}_`)) {
      await archiveAndDeleteDoc("voteAnswers", answerDoc.id);
    }
  }
}

export async function submitVoteAnswer(voteId: string, uid: string, answers: Record<string, string | null>): Promise<void> {
  const answerId = `${voteId}_${uid}`;
  const answerRef = doc(db, "voteAnswers", answerId);
  await setDoc(answerRef, {
    voteId,
    uid,
    answers,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deleteMyVoteAnswer(voteId: string, uid: string): Promise<void> {
  const answerId = `${voteId}_${uid}`;
  await archiveAndDeleteDoc("voteAnswers", answerId);
}
