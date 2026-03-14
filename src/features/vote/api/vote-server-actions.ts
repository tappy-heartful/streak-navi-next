import "server-only";
import { adminDb as db } from "@/src/lib/firebase-admin";
import { Vote, VoteAnswer } from "@/src/lib/firestore/types";

export async function fetchVotes(): Promise<Vote[]> {
  const snapshot = await db.collection("votes").orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || "",
      description: data.description || "",
      descriptionLink: data.descriptionLink || "",
      acceptStartDate: data.acceptStartDate || "",
      acceptEndDate: data.acceptEndDate || "",
      isAnonymous: data.isAnonymous ?? false,
      hideVotes: data.hideVotes ?? false,
      createdBy: data.createdBy || "",
      createdAt: data.createdAt?.toMillis() || 0,
      updatedAt: data.updatedAt?.toMillis() || 0,
      items: data.items || [],
    };
  });
}

export async function fetchVote(id: string): Promise<Vote | null> {
  const doc = await db.collection("votes").doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name || "",
    description: data.description || "",
    descriptionLink: data.descriptionLink || "",
    acceptStartDate: data.acceptStartDate || "",
    acceptEndDate: data.acceptEndDate || "",
    isAnonymous: data.isAnonymous ?? false,
    hideVotes: data.hideVotes ?? false,
    createdBy: data.createdBy || "",
    createdAt: data.createdAt?.toMillis() || 0,
    updatedAt: data.updatedAt?.toMillis() || 0,
    items: data.items || [],
  };
}

export async function fetchVoteAnswersMap(): Promise<Record<string, number>> {
  const snapshot = await db.collection("voteAnswers").get();
  const map: Record<string, number> = {};
  snapshot.docs.forEach((doc) => {
    const voteId = doc.id.split("_")[0];
    map[voteId] = (map[voteId] || 0) + 1;
  });
  return map;
}

export async function fetchVoteAnswersByVoteId(voteId: string): Promise<VoteAnswer[]> {
  const snapshot = await db.collection("voteAnswers").get();
  return snapshot.docs
    .filter((doc) => doc.id.startsWith(voteId + "_"))
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        voteId: data.voteId,
        uid: data.uid,
        answers: data.answers || {},
        updatedAt: data.updatedAt?.toMillis() || 0,
      };
    });
}

export async function fetchMyVoteAnswer(voteId: string, uid: string): Promise<VoteAnswer | null> {
  const doc = await db.collection("voteAnswers").doc(`${voteId}_${uid}`).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    voteId: data.voteId,
    uid: data.uid,
    answers: data.answers || {},
    updatedAt: data.updatedAt?.toMillis() || 0,
  };
}
