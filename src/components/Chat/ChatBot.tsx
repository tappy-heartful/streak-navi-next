"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { getAuth } from "firebase/auth";
import styles from "./ChatBot.module.css";

/** AIレスポンスを本文とリンクカードに分割してレンダリング */
function BubbleContent({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  // [ラベル](/path) 形式のリンクを抽出
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>);
    }
    const label = match[1];
    const href  = match[2];
    parts.push(
      <Link key={match.index} href={href} className={styles.linkCard} onClick={onNavigate}>
        <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.75rem" }} />
        {label}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

type Message = {
  role: "user" | "model";
  text: string;
};

type GeminiHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "こんにちは！Streak NaviのAIコンシェルジュです。\nイベント・投票・コールなどについて何でも聞いてください 😊" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildHistory = (): GeminiHistoryItem[] => {
    // system prompt の2件はAPI側で追加するためここでは送らない
    return messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text, history: buildHistory() }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = typeof data.error === "object"
          ? (data.error?.message ?? "不明なエラー")
          : (data.error ?? "不明なエラー");
        setMessages((prev) => [
          ...prev,
          { role: "model", text: `申し訳ありません、エラーが発生しました。\n${errMsg}` },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "model", text: data.reply ?? "エラーが発生しました。もう一度試してください。" },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: `通信エラー: ${e instanceof Error ? e.message : String(e)}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      sendMessage();
    }
  };

  return (
    <>
      {/* フローティングボタン */}
      {!open && (
        <button className={styles.fab} onClick={() => setOpen(true)}>
          <i className="fa-solid fa-comment-dots" />
          AIに聞く
        </button>
      )}

      {/* オーバーレイ */}
      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)} />
      )}

      {/* チャットパネル */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <i className="fa-solid fa-robot" />
              AIコンシェルジュ
              <span className={styles.panelSubtitle}>Streak Navi</span>
            </div>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className={styles.messages}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`${styles.msgRow} ${m.role === "user" ? styles.msgRowUser : ""}`}
              >
                {m.role === "model" && (
                  <div className={styles.avatar}>
                    <i className="fa-solid fa-robot" />
                  </div>
                )}
                <div
                  className={`${styles.bubble} ${
                    m.role === "model" ? styles.bubbleAi : styles.bubbleUser
                  }`}
                >
                  {m.role === "model"
                    ? <BubbleContent text={m.text} onNavigate={() => setOpen(false)} />
                    : m.text
                  }
                </div>
              </div>
            ))}

            {loading && (
              <div className={styles.msgRow}>
                <div className={styles.avatar}>
                  <i className="fa-solid fa-robot" />
                </div>
                <div className={`${styles.bubble} ${styles.bubbleAi} ${styles.typing}`}>
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="質問を入力してください"
              disabled={loading}
            />
            <button
              className={styles.sendBtn}
              onClick={sendMessage}
              disabled={!input.trim() || loading}
            >
              <i className="fa-solid fa-paper-plane" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
