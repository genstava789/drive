"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { DriveFile } from "@/types/drive";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Play,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { formatBytes, getVideoStreamUrl } from "@/lib/utils";

const VidstackPlayer = dynamic(
  () =>
    import("./vidstack-player-inner").then((mod) => mod.VidstackPlayerInner),
  {
    ssr: false,
    loading: () => <VideoLoadingSkeleton />,
  }
);

function VideoLoadingSkeleton() {
  return (
    <div className="w-full aspect-video bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-800">
      <div className="relative flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <Video className="h-4 w-4 text-blue-400 absolute" />
      </div>
      <div className="flex flex-col items-center text-center px-4">
        <p className="text-xs font-semibold text-slate-200">
          Menyiapkan Pemutar Video...
        </p>
      </div>
    </div>
  );
}

interface VideoPreviewProps {
  file: DriveFile;
  accountIndex?: number;
}

export function VideoPreview({ file, accountIndex = 0 }: VideoPreviewProps) {
  // Video player and its title/badges are completely hidden/collapsed by default
  const [isOpen, setIsOpen] = useState(false);

  // Direct HTTP 206 streaming proxy URL
  const streamUrl = getVideoStreamUrl(file.id, accountIndex);

  // Get high-res poster thumbnail from Google Drive if available
  const posterUrl = file.thumbnailLink
    ? file.thumbnailLink.replace(/=s\d+[^/]*$/, "=s1200")
    : undefined;

  // Extract video format & resolution info from filename
  const fileNameLower = file.name.toLowerCase();
  const formatMatch = file.name.match(/\.(mp4|mkv|webm|mov|avi|wmv|flv|m4v|ts)$/i);
  const videoFormat = formatMatch ? formatMatch[1].toUpperCase() : "VIDEO";

  const resolution = fileNameLower.includes("2160p") || fileNameLower.includes("4k")
    ? "4K Ultra HD"
    : fileNameLower.includes("1080p")
    ? "1080p FHD"
    : fileNameLower.includes("720p")
    ? "720p HD"
    : fileNameLower.includes("480p")
    ? "480p SD"
    : null;

  // 1. COLLAPSED STATE (Default):
  // Clean UI Card with poster and play icon. No title or badges sitting above it.
  if (!isOpen) {
    return (
      <div
        onClick={() => setIsOpen(true)}
        className="group relative aspect-video sm:aspect-[21/9] md:aspect-video w-full cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/90 bg-slate-950 shadow-xs flex items-center justify-center select-none transition-all hover:border-blue-400 hover:shadow-md"
        title="Klik untuk membuka pemutar video (Open Video)"
      >
        {posterUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl}
              alt={file.name}
              className="w-full h-full object-cover opacity-75 group-hover:opacity-85 group-hover:scale-105 transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/50 group-hover:from-black/75 transition-colors" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.2),transparent_70%)]" />
          </div>
        )}

        {/* Centered Glowing Play Button & "Open Video" Pill */}
        <div className="relative z-10 flex flex-col items-center gap-2.5 sm:gap-3">
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-900/50 ring-4 ring-white/25 group-hover:scale-110 group-hover:bg-blue-500 transition-all duration-300">
            <Play className="h-6 w-6 sm:h-7 sm:w-7 fill-white ml-0.5 text-white" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-900/90 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white backdrop-blur shadow-lg border border-white/10 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all">
            <span>Open Video</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. OPEN STATE:
  // Both the video player AND the title element, quality badge, format badge, and size badge are now displayed together!
  return (
    <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs transition-all w-full">
      {/* Header Info: Title & Quality Badges (Clean, Mobile-Friendly, No Truncation) */}
      <div className="p-3 sm:p-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs shrink-0 mt-0.5">
            <Video className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2
              className="font-bold text-slate-900 text-xs sm:text-sm leading-snug break-words [overflow-wrap:anywhere]"
              title={file.name}
            >
              {file.name}
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Format Badge */}
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 font-mono border-slate-200 text-slate-700 bg-white"
              >
                {videoFormat}
              </Badge>

              {/* Resolution / Quality Badge */}
              {resolution && (
                <Badge
                  variant="info"
                  className="text-[10px] px-1.5 py-0 font-semibold"
                >
                  {resolution}
                </Badge>
              )}

              {/* File Size */}
              {file.size ? (
                <span className="text-[10px] font-mono text-slate-500">
                  {formatBytes(file.size)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Close Button to collapse back to Open Video card */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-7.5 px-2.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg shrink-0 gap-1 cursor-pointer"
          title="Tutup Pemutar Video"
        >
          <ChevronUp className="h-3.5 w-3.5" />
          <span>Tutup</span>
        </Button>
      </div>

      {/* Vidstack Video Player */}
      <div className="w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
        <VidstackPlayer
          src={streamUrl}
          title={file.name}
          poster={posterUrl}
          mimeType={file.mimeType}
          autoPlay={true}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
