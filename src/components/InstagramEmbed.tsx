"use client";

import { useState, useEffect, useRef } from "react";

type Props = {
  url: string;
};

// 各 iframe の contentWindow と高さ更新コールバックを紐付けるグローバルレジストリ
const iframeRegistry = new Map<Window, (h: number) => void>();
let globalListenerAdded = false;

function ensureGlobalListener() {
  if (globalListenerAdded) return;
  globalListenerAdded = true;
  window.addEventListener("message", (e: MessageEvent) => {
    if (!e.source || !e.origin.includes("instagram.com")) return;
    const cb = iframeRegistry.get(e.source as Window);
    if (!cb) return;
    let data = e.data;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { return; }
    }
    const h = data?.details?.height;
    if (typeof h === "number" && h > 50) cb(h);
  });
}

/**
 * Instagram 埋め込みコンポーネント
 * embed.js 不要。各 iframe の postMessage を正確に紐付けて高さを動的調整する。
 */
export function InstagramEmbed({ url }: Props) {
  const match = url.match(/instagram\.com\/p\/([A-Za-z0-9_\-]+)/);
  if (!match) return null;
  const shortcode = match[1];

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    ensureGlobalListener();
    const iframe = iframeRef.current;
    if (!iframe) return;

    // iframe がロードされてから contentWindow を登録する
    const onLoad = () => {
      const win = iframe.contentWindow;
      if (!win) return;
      iframeRegistry.set(win, setHeight);
    };
    iframe.addEventListener("load", onLoad);

    return () => {
      iframe.removeEventListener("load", onLoad);
      if (iframe.contentWindow) iframeRegistry.delete(iframe.contentWindow);
    };
  }, []);

  return (
    <div className="instagram-embed">
      <iframe
        ref={iframeRef}
        src={`https://www.instagram.com/p/${shortcode}/embed/`}
        className="instagram-iframe"
        frameBorder={0}
        scrolling="no"
        allowTransparency={true}
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
