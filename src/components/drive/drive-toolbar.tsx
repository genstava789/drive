"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import {
  Search,
  X,
  LayoutList,
  LayoutGrid,
  RefreshCw,
  Folder,
  File,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Presentation,
  Filter,
  FileArchive,
  Film,
} from "lucide-react";
import { FileCategoryFilter } from "@/types/drive";

interface DriveToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: FileCategoryFilter;
  onCategoryChange: (category: FileCategoryFilter) => void;
  viewMode: "table" | "grid";
  onViewModeChange: (mode: "table" | "grid") => void;
  onRefresh: () => void;
  isLoading: boolean;
  isMockData?: boolean;
}

const CATEGORIES: {
  id: FileCategoryFilter;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "all", label: "Semua" },
  { id: "folder", label: "Folder", icon: Folder },
  { id: "file", label: "File Only", icon: File },
  { id: "document", label: "Dokumen", icon: FileText },
  { id: "spreadsheet", label: "Spreadsheet", icon: FileSpreadsheet },
  { id: "presentation", label: "Slide", icon: Presentation },
  { id: "image", label: "Gambar", icon: ImageIcon },
  { id: "media", label: "Video", icon: Film },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "archive", label: "ZIP", icon: FileArchive },
];

export function DriveToolbar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  viewMode,
  onViewModeChange,
  onRefresh,
  isLoading,
}: DriveToolbarProps) {
  return (
    <div className="space-y-2.5">
      {/* Search & Actions Row - Single unified responsive flex row */}
      <div className="flex items-center gap-2 w-full">
        {/* Search input takes all available width */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari berkas..."
            className="h-8.5 sm:h-9 pl-8 pr-7 text-xs sm:text-sm bg-white border-slate-200/90 rounded-xl shadow-2xs focus-visible:ring-blue-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* View Mode Toggle - Compact circular pill segmented control */}
        <div className="flex items-center rounded-full border border-slate-200/90 bg-slate-100/70 p-0.5 shadow-2xs shrink-0">
          <button
            onClick={() => onViewModeChange("table")}
            className={`flex h-7 w-7 sm:h-7.5 sm:w-7.5 items-center justify-center rounded-full transition-all cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Tampilan Tabel"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange("grid")}
            className={`flex h-7 w-7 sm:h-7.5 sm:w-7.5 items-center justify-center rounded-full transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Tampilan Grid"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Refresh Icon Button - Circular, well-proportioned icon */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          title="Muat Ulang Berkas"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 transition-transform ${
              isLoading ? "animate-spin text-blue-600" : ""
            }`}
          />
        </button>
      </div>

      {/* Category Filter Pills - Compact horizontal scroller */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 mr-0.5 flex items-center gap-1 shrink-0">
          <Filter className="h-3 w-3" />
        </span>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-medium transition whitespace-nowrap cursor-pointer shrink-0 ${
                isSelected
                  ? "bg-blue-600 text-white shadow-2xs font-semibold"
                  : "bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {Icon && <Icon className="h-3 w-3" />}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
