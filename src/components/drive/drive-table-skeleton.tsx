"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DriveTableSkeletonProps {
  rowCount?: number;
}

export function DriveTableSkeleton({ rowCount = 7 }: DriveTableSkeletonProps) {
  const rows = Array.from({ length: rowCount }, (_, i) => i);

  // Staggered title widths for realistic loading appearance
  const titleWidths = [
    "w-48 sm:w-64",
    "w-36 sm:w-52",
    "w-56 sm:w-72",
    "w-40 sm:w-60",
    "w-32 sm:w-44",
    "w-52 sm:w-68",
    "w-44 sm:w-56",
  ];

  // Soft icon color accents for skeleton items
  const iconColors = [
    "bg-amber-100/70",
    "bg-blue-100/70",
    "bg-emerald-100/70",
    "bg-purple-100/70",
    "bg-rose-100/70",
    "bg-indigo-100/70",
    "bg-cyan-100/70",
  ];

  return (
    <div className="space-y-2.5 animate-in fade-in duration-200">
      {/* Table Container Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        {/* Mobile Sorting Bar Skeleton - only on small screens */}
        <div className="sm:hidden flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200/80 bg-[#F8F9FA]/90">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
          <Skeleton className="h-7.5 w-7.5 rounded-full shrink-0" />
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-slate-200/80 bg-[#F8F9FA]/90 select-none">
              {/* Nama Column */}
              <TableHead className="h-9 px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-700 normal-case">
                <span>Nama</span>
              </TableHead>

              {/* Tipe Column */}
              <TableHead className="hidden sm:table-cell h-9 px-3.5 sm:px-4 py-2 w-32 text-xs font-semibold text-slate-700 normal-case">
                <span>Tipe</span>
              </TableHead>

              {/* Ukuran Column */}
              <TableHead className="hidden sm:table-cell h-9 px-3.5 sm:px-4 py-2 w-28 text-xs font-semibold text-slate-700 normal-case">
                <span>Ukuran</span>
              </TableHead>

              {/* Diubah Column */}
              <TableHead className="hidden md:table-cell h-9 px-3.5 sm:px-4 py-2 w-36 text-xs font-semibold text-slate-700 normal-case">
                <span>Diubah</span>
              </TableHead>

              {/* Pemilik Column */}
              <TableHead className="hidden lg:table-cell h-9 px-3.5 sm:px-4 py-2 w-32 text-xs font-semibold text-slate-700 normal-case">
                <span>Pemilik</span>
              </TableHead>

              {/* Aksi Column */}
              <TableHead className="h-9 px-3.5 sm:px-4 py-2 w-12 text-right">
                <span className="sr-only">Aksi</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((idx) => {
              const widthClass = titleWidths[idx % titleWidths.length];
              const iconColor = iconColors[idx % iconColors.length];

              return (
                <TableRow
                  key={idx}
                  className="hover:bg-transparent border-b border-slate-100"
                >
                  {/* Nama with Icon */}
                  <TableCell className="p-2.5 sm:p-3 px-3.5 sm:px-4">
                    <div className="flex items-center gap-2.5 py-0.5">
                      <div
                        data-slot="skeleton"
                        className={`h-7 w-7 rounded-lg ${iconColor} dark:bg-slate-800 midnight:bg-slate-800 shrink-0 animate-pulse`}
                      />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <Skeleton className={`h-3.5 ${widthClass} rounded`} />
                        <div className="sm:hidden">
                          <Skeleton className="h-2.5 w-28 rounded" />
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Tipe Badge */}
                  <TableCell className="hidden sm:table-cell p-2.5 sm:p-3 px-3.5 sm:px-4 w-32">
                    <div className="flex items-center">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </TableCell>

                  {/* Ukuran */}
                  <TableCell className="hidden sm:table-cell p-2.5 sm:p-3 px-3.5 sm:px-4 w-28">
                    <Skeleton className="h-3.5 w-14 rounded" />
                  </TableCell>

                  {/* Diubah */}
                  <TableCell className="hidden md:table-cell p-2.5 sm:p-3 px-3.5 sm:px-4 w-36">
                    <Skeleton className="h-3.5 w-24 rounded" />
                  </TableCell>

                  {/* Pemilik */}
                  <TableCell className="hidden lg:table-cell p-2.5 sm:p-3 px-3.5 sm:px-4 w-32">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                  </TableCell>

                  {/* Aksi Dots */}
                  <TableCell className="p-2.5 sm:p-3 px-3.5 sm:px-4 w-12 text-right">
                    <div className="flex justify-end">
                      <Skeleton className="h-6 w-6 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Status without Skeleton boxes */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-400">
        <span className="font-medium">Memuat daftar berkas &amp; folder...</span>
        <span className="text-[11px] font-mono">Sinkronisasi</span>
      </div>
    </div>
  );
}
