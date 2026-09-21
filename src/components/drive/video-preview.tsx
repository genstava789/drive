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
  // Harmonious UI card matching the existing image preview card styling
  if (!isOpen) {
    return (
      <div
        onClick={() => setIsOpen(true)}
        className="relative group rounded-xl overflow-hidden border border-slate-200/80 bg-slate-50/80 max-h-72 sm:max-h-80 flex items-center justify-center p-2 cursor-pointer select-none transition hover:border-blue-300"
        title="Klik untuk membuka pemutar video (Open Video)"
      >
        {posterUrl ? (
          <div className="relative max-h-64 sm:max-h-72 w-full flex items-center justify-center overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl}
              alt={file.name}
              className="max-h-60 sm:max-h-68 w-auto object-contain rounded-lg shadow-2xs group-hover:opacity-95 group-hover:scale-102 transition duration-300"
            />
            <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors rounded-lg" />
          </div>
        ) : (
          <div className="h-56 w-full rounded-lg bg-slate-900 flex items-center justify-center">
            <Video className="h-12 w-12 text-slate-700" />
          </div>
        )}

        {/* Centered Glowing Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex h-13 w-13 sm:h-15 sm:w-15 items-center justify-center rounded-full bg-blue-600/95 text-white shadow-xl shadow-blue-900/40 ring-4 ring-white/30 group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-300">
            <Play className="h-6 w-6 sm:h-6.5 sm:w-6.5 fill-white ml-0.5 text-white" />
          </div>
        </div>

        {/* Bottom-right Floating Pill Button "Open Video" */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-slate-900/85 text-white text-[11px] font-semibold px-3.5 py-1.5 backdrop-blur shadow-md hover:bg-blue-600 transition cursor-pointer"
        >
          <Play className="h-3 w-3 fill-white" />
          <span>Open Video</span>
        </button>
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
