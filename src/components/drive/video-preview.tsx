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
  // Video player is hidden/collapsed by default
  const [isOpen, setIsOpen] = useState(false);

  // Direct HTTP 206 streaming proxy URL
  const streamUrl = getVideoStreamUrl(file.id, accountIndex);

  // High-res poster thumbnail from Google Drive
  const posterUrl = file.thumbnailLink
    ? file.thumbnailLink.replace(/=s\d+[^/]*$/, "=s1200")
    : undefined;

  // Extract video format & resolution info from filename
  const fileNameLower = file.name.toLowerCase();
  const formatMatch = file.name.match(/\.(mp4|mkv|webm|mov|avi|wmv|flv|m4v|ts|m2ts|3gp|vob)$/i);
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
  // Clean UI Card with Play Icon and Open Video button (No broken image preview)
  if (!isOpen) {
    return (
      <div
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl border border-blue-100/90 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/80 p-3.5 sm:p-4.5 shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between gap-3 sm:gap-4 select-none group"
        title="Klik untuk membuka pemutar video"
      >
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
          {/* Play Icon */}
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25 group-hover:scale-105 group-hover:bg-blue-700 transition-all shrink-0">
            <Play className="h-5 w-5 sm:h-5.5 sm:w-5.5 fill-white ml-0.5" />
          </div>

          {/* Title & Format Info */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-blue-600 transition-colors">
                Open Video Player
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 font-mono border-blue-200 text-blue-700 bg-white shadow-2xs"
              >
                {videoFormat}
              </Badge>
              {resolution && (
                <Badge
                  variant="info"
                  className="text-[10px] px-1.5 py-0 font-semibold"
                >
                  {resolution}
                </Badge>
              )}
              {file.size ? (
                <span className="text-[10px] font-mono text-slate-500">
                  {formatBytes(file.size)}
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Klik untuk memutar video ini secara langsung dengan Vidstack
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button
          size="sm"
          className="h-8.5 sm:h-9 px-3.5 sm:px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 group-hover:shadow-md transition-all cursor-pointer"
        >
          <Play className="h-3.5 w-3.5 fill-white" />
          <span>Open Video</span>
        </Button>
      </div>
    );
  }

  // 2. OPEN STATE:
  // Both the video player AND the title element, quality badge, format badge, and size badge are displayed together!
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200/90 bg-white shadow-xs transition-all w-full">
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
