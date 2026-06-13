import "server-only";
import { adminDb } from "@/src/lib/firebase-admin";
import { Issue, IssueGroup, IssueComment } from "@/src/lib/firestore/types";

export async function getIssues(): Promise<Issue[]> {
  const snapshot = await adminDb.collection("issues").orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      links: (data.links || []).map((l: any) => ({
        title: l.title || "",
        url: l.url || ""
      })),
      createdAt: data.createdAt?.toMillis?.() || data.createdAt || 0,
      updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || 0,
    } as Issue;
  });
}

export async function getIssue(id: string): Promise<Issue | null> {
  const doc = await adminDb.collection("issues").doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
    links: (data.links || []).map((l: any) => ({
      title: l.title || "",
      url: l.url || ""
    })),
    createdAt: data.createdAt?.toMillis?.() || data.createdAt || 0,
    updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || 0,
  } as Issue;
}

export async function getIssueGroups(): Promise<IssueGroup[]> {
  const snapshot = await adminDb.collection("issueGroups").orderBy("name", "asc").get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toMillis?.() || data.createdAt || 0,
      updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || 0,
    } as IssueGroup;
  });
}

export async function getIssueComments(issueId: string): Promise<IssueComment[]> {
  const snapshot = await adminDb
    .collection("issues")
    .doc(issueId)
    .collection("comments")
    .orderBy("createdAt", "asc")
    .get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      issueId,
      text: data.text || "",
      createdBy: data.createdBy || "",
      createdByName: data.createdByName || "",
      createdAt: data.createdAt?.toMillis?.() || data.createdAt || 0,
    } as IssueComment;
  });
}
