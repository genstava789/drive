"use client";

import React from "react";
import { ChevronRight, HardDrive, ArrowLeft, Folder } from "lucide-react";
import { BreadcrumbItem } from "@/types/drive";

interface BreadcrumbNavProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (folderId: string, index: number) => void;
}

export function BreadcrumbNav({ breadcrumbs, onNavigate }: BreadcrumbNavProps) {
  const canGoBack = breadcrumbs.length > 1;

  const handleBack = () => {
    if (canGoBack) {
      const prevIndex = breadcrumbs.length - 2;
      onNavigate(breadcrumbs[prevIndex].id, prevIndex);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 py-0.5 px-0.5">
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full">
        {canGoBack && (
          <button
            onClick={handleBack}
            className="flex h-7 w-7 sm:h-7.5 sm:w-7.5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer mr-0.5"
            title="Kembali ke folder sebelumnya"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        )}

        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <React.Fragment key={item.id}>
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 mx-0.5" />
              )}
              <button
                onClick={() => !isLast && onNavigate(item.id, index)}
                disabled={isLast}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs sm:text-sm transition-all whitespace-nowrap ${
                  isLast
                    ? "bg-slate-100/90 text-slate-900 font-bold shadow-2xs border border-slate-200/60 cursor-default"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 font-medium cursor-pointer"
                }`}
              >
                {index === 0 ? (
                  <HardDrive className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLast ? "text-blue-600" : "text-slate-500"}`} />
                ) : (
                  <Folder className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLast ? "text-amber-500" : "text-slate-400"}`} fill={isLast ? "currentColor" : "none"} fillOpacity={0.2} />
                )}
                <span className="truncate max-w-[140px] sm:max-w-none">{item.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
