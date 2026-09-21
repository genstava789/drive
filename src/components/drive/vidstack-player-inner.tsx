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

  const mediaSource = mimeType
    ? { src, type: mimeType as any }
    : src;

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
        <MediaProvider>
          {poster && (
            <Poster
              src={poster}
              alt={title}
              className="vds-poster object-contain w-full h-full bg-black/60"
            />
          )}
        </MediaProvider>
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
