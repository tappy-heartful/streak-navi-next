"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import styles from "./YouTubePlayer.module.css";

// YouTube IFrame API の型宣言（最小限の安全な型）
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<any> | null = null;

/**
 * YouTube IFrame Player API スクリプトを1度だけ動的にロードする
 */
export function loadYouTubeIframeAPI(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not defined"));
  }

  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise((resolve) => {
    // 既存スクリプトがあるかチェック
    const existing = document.getElementById("youtube-iframe-api-script");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") {
        previousCallback();
      }
      resolve(window.YT);
    };
  });

  return apiPromise;
}

interface YouTubePlayerProps {
  videoId: string;
  onEnded?: () => void;
  autoPlay?: boolean;
  showLink?: boolean;
  showNotice?: boolean;
  playlistLink?: string;
  className?: string;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  onEnded,
  autoPlay = false,
  showLink = false,
  showNotice = false,
  playlistLink,
  className,
}) => {
  const containerId = useId().replace(/:/g, "_");
  const playerId = `yt_player_${containerId}`;
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const onEndedRef = useRef(onEnded);
  const hasUserStartedRef = useRef(false);
  const prevVideoIdRef = useRef(videoId);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  // YouTube Player の初期化
  useEffect(() => {
    let isCancelled = false;

    loadYouTubeIframeAPI()
      .then((YT) => {
        if (isCancelled) return;

        // すでにプレーヤーが存在する場合は何もしない
        if (playerRef.current) return;

        try {
          playerRef.current = new YT.Player(playerId, {
            videoId,
            playerVars: {
              autoplay: autoPlay ? 1 : 0,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
            },
            events: {
              onReady: () => {
                if (isCancelled) return;
                setIsReady(true);
              },
              onStateChange: (event: any) => {
                // YT.PlayerState.PLAYING = 1
                if (event.data === 1) {
                  hasUserStartedRef.current = true;
                }
                // YT.PlayerState.ENDED = 0
                if (event.data === 0) {
                  if (onEndedRef.current) {
                    onEndedRef.current();
                  }
                }
              },
            },
          });
        } catch (err) {
          console.error("Failed to initialize YouTube Player:", err);
        }
      })
      .catch((err) => {
        console.error("Failed to load YouTube API:", err);
      });

    return () => {
      isCancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [playerId]);

  // videoId が変更されたときの処理（プレイヤー再生成なしで動画切り替え）
  useEffect(() => {
    if (!playerRef.current || !isReady) return;
    if (prevVideoIdRef.current === videoId) return;

    prevVideoIdRef.current = videoId;

    try {
      // ユーザーがすでに再生を開始していた場合、または autoPlay が true の場合は即座に再生
      if (hasUserStartedRef.current || autoPlay) {
        playerRef.current.loadVideoById(videoId);
      } else {
        playerRef.current.cueVideoById(videoId);
      }
    } catch (e) {
      console.warn("Could not load video by id:", e);
    }
  }, [videoId, isReady, autoPlay]);

  const targetLink = playlistLink || `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div className={`${styles.wrapper} ${className || ""}`}>
      <div className={styles.aspectRatioBox}>
        <div id={playerId} className={styles.playerElement} />
      </div>

      {(showLink || showNotice) && (
        <div className={styles.noticeLinkContainer}>
          {showNotice && <span className={styles.notice}>🔒限定公開</span>}
          {showLink && (
            <a
              href={targetLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {playlistLink ? "プレイリストを聴く" : "YouTubeでみる"}
            </a>
          )}
        </div>
      )}
    </div>
  );
};

YouTubePlayer.displayName = "YouTubePlayer";
