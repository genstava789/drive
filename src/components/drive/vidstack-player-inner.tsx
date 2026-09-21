"use client";

import React, { useRef } from "react";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import {
  MediaPlayer,
  MediaProvider,
  Poster,
  type MediaPlayerInstance,
} from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";

export interface VidstackPlayerProps {
  src: string;
  title: string;
  poster?: string;
  mimeType?: string;
  autoPlay?: boolean;
  className?: string;
}

export function VidstackPlayerInner({
  src,
  title,
  poster,
  mimeType,
  autoPlay = true,
  className = "",
}: VidstackPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);

  // Normalize MIME types for Vidstack compatibility
  // Vidstack's VideoProvider natively recognizes: video/mp4, video/webm, video/3gp, video/ogg, video/avi, video/mpeg.
  // Google Drive returns 'video/matroska' or 'video/x-matroska' for MKV files, which Vidstack rejects unless normalized.
  const isMkv =
    Boolean(mimeType?.includes("matroska")) ||
    Boolean(title?.toLowerCase().endsWith(".mkv")) ||
    Boolean(src.toLowerCase().includes(".mkv"));

  const effectiveMimeType = isMkv
    ? "video/webm"
    : mimeType || "video/mp4";

  const mediaSource = { src, type: effectiveMimeType as any };

  return (
    <div
      className={`vidstack-container relative w-full overflow-hidden bg-black ${className}`}
    >
      <MediaPlayer
        ref={playerRef}
        title={title}
        src={mediaSource}
        poster={poster}
        crossOrigin="anonymous"
        playsInline
        autoPlay={autoPlay}
        storage={`levidrive_playback_${encodeURIComponent(title)}`}
        className="w-full h-full aspect-video bg-black"
      >
        <MediaProvider />

        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          colorScheme="dark"
          slots={{
            title: null,
          }}
        />
      </MediaPlayer>
    </div>
  );
}
