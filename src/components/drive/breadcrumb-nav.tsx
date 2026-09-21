"use client";

import React from "react";
import { ChevronRight, HardDrive, ArrowLeft } from "lucide-react";
import { BreadcrumbItem } from "@/types/drive";
import { Button } from "@/components/ui/button";

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
    <div className="flex items-center justify-between gap-3 py-2 px-1">
      <div className="flex items-center gap-1.5 overflow-x-auto text-sm no-scrollbar py-0.5">
        {canGoBack && (
          <Button
            variant="ghost"
            size="iconSm"
            onClick={handleBack}
            className="h-7 w-7 text-slate-500 hover:text-slate-900 mr-1"
            title="Kembali ke folder sebelumnya"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
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
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap ${
                  isLast
                    ? "bg-slate-200/60 text-slate-900 font-semibold cursor-default shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                }`}
              >
                {index === 0 && <HardDrive className="h-3.5 w-3.5 text-blue-600" />}
                <span>{item.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
