"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  X,
  LayoutList,
  LayoutGrid,
  RefreshCw,
  Folder,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Presentation,
  Filter,
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
  { id: "all", label: "Semua Berkas" },
  { id: "folder", label: "Folder", icon: Folder },
  { id: "document", label: "Dokumen", icon: FileText },
  { id: "spreadsheet", label: "Spreadsheet", icon: FileSpreadsheet },
  { id: "presentation", label: "Slide", icon: Presentation },
  { id: "image", label: "Gambar", icon: ImageIcon },
  { id: "pdf", label: "PDF" },
  { id: "archive", label: "Arsip (ZIP)" },
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
  isMockData,
}: DriveToolbarProps) {
  return (
    <div className="space-y-3">
      {/* Top Search & Controls Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search Bar with clear button */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari berkas atau folder Google Drive..."
            className="pl-9 pr-8 bg-white border-slate-200/90 text-sm h-9 shadow-2xs focus-visible:ring-blue-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-9 px-3 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
            title="Muat Ulang Berkas"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`}
            />
            <span className="hidden md:inline text-xs ml-1.5">Segarkan</span>
          </Button>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => onViewModeChange("table")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-slate-100 text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Tampilan Tabel Detail (TanStack)"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
            <button
              onClick={() => onViewModeChange("grid")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                viewMode === "grid"
                  ? "bg-slate-100 text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Tampilan Grid Kartu"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
        <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
          <Filter className="h-3 w-3" /> Filter:
        </span>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                isSelected
                  ? "bg-blue-600 text-white shadow-2xs font-semibold"
                  : "bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
