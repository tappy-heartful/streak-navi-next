import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { adminAuth } from "@/src/lib/firebase-admin";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Firestore REST API ヘルパー ──

function parseValue(val: Record<string, unknown>): unknown {
  if ("stringValue"    in val) return val.stringValue;
  if ("integerValue"   in val) return Number(val.integerValue);
  if ("doubleValue"    in val) return val.doubleValue;
  if ("booleanValue"   in val) return val.booleanValue;
  if ("timestampValue" in val) return new Date(val.timestampValue as string).getTime();
  if ("nullValue"      in val) return null;
  if ("arrayValue"     in val) {
    const items = (val.arrayValue as { values?: unknown[] }).values ?? [];
    return items.map(v => parseValue(v as Record<string, unknown>));
  }
  if ("mapValue" in val) {
    const fields = (val.mapValue as { fields?: Record<string, unknown> }).fields ?? {};
    return parseFields(fields);
  }
  return null;
}

function parseFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = parseValue(v as Record<string, unknown>);
  }
  return result;
}

function parseDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const name = doc.name as string | undefined;
  const id = name?.split("/").pop() ?? "";
  const fields = parseFields((doc.fields ?? {}) as Record<string, unknown>);
  return { id, ...fields };
}

type QueryResult = { docs: Record<string, unknown>[]; denied?: boolean };

/** コレクション全件取得 */
async function getCollection(collection: string, idToken: string, limit = 10): Promise<QueryResult> {
  try {
    const res = await fetch(`${FS_BASE}/${collection}?pageSize=${limit}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.status === 403 || res.status === 401) return { docs: [], denied: true };
    if (!res.ok) return { docs: [] };
    const data = await res.json();
    return { docs: (data.documents ?? []).map(parseDoc) };
  } catch {
    return { docs: [] };
  }
}

/** where + orderBy クエリ */
async function queryCollection(
  collection: string,
  idToken: string,
  where: { field: string; op: string; value: string },
  orderByField: string,
  direction: "ASCENDING" | "DESCENDING",
  limit = 5
): Promise<QueryResult> {
  try {
    const body = {
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath: where.field },
            op: where.op,
            value: { stringValue: where.value },
          },
        },
        orderBy: [{ field: { fieldPath: orderByField }, direction }],
        limit,
      },
    };
    const res = await fetch(`${FS_BASE}:runQuery`, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 403 || res.status === 401) return { docs: [], denied: true };
    if (!res.ok) return { docs: [] };
    const results: unknown[] = await res.json();
    const docs = (results as Record<string, unknown>[])
      .filter(r => r.document)
      .map(r => parseDoc(r.document as Record<string, unknown>));
    return { docs };
  } catch {
    return { docs: [] };
  }
}

function fmtResult(result: QueryResult, fn: (d: Record<string, unknown>) => string): string {
  if (result.denied) return "（この情報にアクセスする権限がありません）";
  const lines = result.docs.map(fn).filter(Boolean);
  return lines.length ? lines.join("\n") : "なし";
}

// ── verifyUser ──

async function verifyUser(req: NextRequest): Promise<{ uid: string; idToken: string } | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const idToken = authHeader.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return { uid: decoded.uid, idToken };
  } catch {
    return null;
  }
}

// ── fetchContext ──

async function fetchContext(uid: string, idToken: string): Promise<string> {
  const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, ".");

  const [
    eventsResult, votesResult, callsResult,
    scoresResult, studiosResult, livesResult,
    usersResult, ownExpenseResult,
  ] = await Promise.all([
    queryCollection("events", idToken, { field: "date", op: "GREATER_THAN_OR_EQUAL", value: todayStr }, "date", "ASCENDING", 5),
    queryCollection("votes",  idToken, { field: "acceptEndDate", op: "GREATER_THAN_OR_EQUAL", value: todayStr }, "acceptEndDate", "ASCENDING", 5),
    queryCollection("calls",  idToken, { field: "acceptEndDate", op: "GREATER_THAN_OR_EQUAL", value: todayStr }, "acceptEndDate", "ASCENDING", 5),
    getCollection("scores",   idToken, 10),
    getCollection("studios",  idToken, 3),
    getCollection("lives",    idToken, 3),
    getCollection("users",    idToken, 50),
    queryCollection("expenseApplies", idToken, { field: "uid", op: "EQUAL", value: uid }, "createdAt", "DESCENDING", 5),
  ]);

  const myUser = usersResult.docs.find(u => u.id === uid);
  const userName = (myUser?.displayName as string) || "メンバー";

  const events = fmtResult(eventsResult, d => {
    const date = (d.date as string) || "日程調整中";
    let line = `・[ID:${d.id}] ${d.title}（${date}）`;
    if (d.placeName) line += ` 場所:${d.placeName}`;
    if (d.schedule)  line += ` スケジュール:${d.schedule}`;
    if (d.dress)     line += ` 服装:${d.dress}`;
    return line;
  });

  const votes = fmtResult(votesResult, d =>
    `・[ID:${d.id}] ${d.name}（受付:${d.acceptStartDate}～${d.acceptEndDate}）\n  概要:${d.description || "なし"}`
  );

  const calls = fmtResult(callsResult, d =>
    `・[ID:${d.id}] ${d.title}（受付:${d.acceptStartDate}～${d.acceptEndDate}）\n  募集:${(d.items as string[] ?? []).join("、")}`
  );

  const scores = fmtResult(scoresResult, d => {
    let line = `・[ID:${d.id}] ${d.title}`;
    if (d.abbreviation) line += `（略:${d.abbreviation}）`;
    return line;
  });

  const studios = fmtResult(studiosResult, d => {
    let line = `・[ID:${d.id}] ${d.name}`;
    if (d.prefecture) line += `（${d.prefecture}）`;
    if (d.fee)        line += ` 料金:${d.fee}`;
    if (d.access)     line += ` アクセス:${d.access}`;
    return line;
  });

  const lives = fmtResult(livesResult, d =>
    `・[ID:${d.id}] ${d.title || "ライブ"}（${d.date || "日程未定"}）`
  );

  const members = usersResult.denied
    ? "（この情報にアクセスする権限がありません）"
    : usersResult.docs.map(u => `・${u.displayName || "不明"}`).join("\n") || "なし";

  const ownExpenses = fmtResult(ownExpenseResult, d =>
    `・[ID:${d.id}] ${d.name}（¥${d.amount} ${d.date} ${{ pending: "審査待ち", approved: "承認済", returned: "差し戻し" }[d.status as string] || d.status}）`
  );

  return `
【今日の日付】${todayStr}
【あなたの名前】${userName}

【イベント一覧（直近）】
${events}

【投票・アンケート（受付中）】
${votes}

【曲募集（受付中）】
${calls}

【ライブ情報】
${lives}

【練習スタジオ】
${studios}

【楽譜一覧】
${scores}

【自分の経費申請履歴】
${ownExpenses}

【メンバー一覧】
${members}
`.trim();
}

// ── API Route ──

type HistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, history } = await req.json() as { message: string; history?: HistoryItem[] };
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    let context = "";
    try {
      context = await fetchContext(auth.uid, auth.idToken);
    } catch (ctxErr: unknown) {
      console.error("[chat] fetchContext error:", ctxErr instanceof Error ? ctxErr.message : ctxErr);
      context = "（データ取得に失敗しました）";
    }

    const systemInstruction = `あなたは「Streak Navi」というサークル管理アプリのAIコンシェルジュです。
メンバーからの質問に日本語で丁寧・簡潔に答えてください。
「（この情報にアクセスする権限がありません）」と記載されているデータについては、権限がないため回答できないとお伝えください。
データにない情報は「わかりません」と答えてください。

各データのURLパターン（IDは [ID:xxx] から取得すること）:
- イベント詳細: /event/confirm?eventId={id}
- 投票詳細: /vote/confirm?voteId={id}
- 曲募集詳細: /call/confirm?callId={id}
- ライブ詳細: /live/confirm?liveId={id}
- スタジオ詳細: /studio/confirm?studioId={id}
- 楽譜詳細: /score/confirm?scoreId={id}
- 経費申請詳細: /expense-apply/confirm?expenseId={id}
- イベント一覧: /event
- 投票一覧: /vote
- 曲募集一覧: /call
- 楽譜一覧: /score
- 経費申請一覧: /expense-apply

情報を回答する際は、末尾に [ページを開く](/path?key=value) の形式でリンクを付けてください。リンクはURLのみ（絶対パスなし、/から始まる形式）にしてください。

${context}`;

    const validHistory: HistoryItem[] = [];
    const rawHistory = (history ?? []).filter(h => h.role === "user" || h.role === "model");
    const startIdx = rawHistory.findIndex(h => h.role === "user");
    if (startIdx >= 0) {
      const slice = rawHistory.slice(startIdx);
      for (let i = 0; i + 1 < slice.length; i += 2) {
        if (slice[i].role === "user" && slice[i + 1].role === "model") {
          validHistory.push(slice[i], slice[i + 1]);
        }
      }
    }

    const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemInstruction },
      ...validHistory.map(h => ({
        role: h.role === "model" ? "assistant" as const : "user" as const,
        content: h.parts[0]?.text ?? "",
      })),
      { role: "user", content: message },
    ];

    const result = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages,
      max_tokens: 1024,
    });
    return NextResponse.json({ reply: result.choices[0]?.message?.content ?? "" });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[chat] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
