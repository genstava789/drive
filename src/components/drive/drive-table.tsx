"use client";

import React, { useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { DriveFile } from "@/types/drive";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileTypeIcon } from "./file-type-icon";
import { formatBytes, formatDate, getFileCategory } from "@/lib/utils";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  MoreVertical,
  Eye,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Folder,
  FileQuestion,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DriveTableProps {
  data: DriveFile[];
  onOpenFolder: (folderId: string, folderName: string) => void;
  onPreviewFile: (file: DriveFile) => void;
  searchQuery: string;
}

export function DriveTable({
  data,
  onOpenFolder,
  onPreviewFile,
  searchQuery,
}: DriveTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = useMemo<ColumnDef<DriveFile>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-blue-600 transition cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              <span>Nama Berkas</span>
              {isSorted === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>
          );
        },
        cell: ({ row }) => {
          const file = row.original;
          const isFolder = file.mimeType === "application/vnd.google-apps.folder";

          return (
            <div
              className="flex items-center gap-3 py-1 cursor-pointer group"
              onClick={() => {
                if (isFolder) {
                  onOpenFolder(file.id, file.name);
                } else {
                  onPreviewFile(file);
                }
              }}
            >
              <div className="shrink-0 transition-transform group-hover:scale-105">
                <FileTypeIcon mimeType={file.mimeType} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate text-sm">
                  {file.name}
                </p>
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                  {file.mimeType}
                </p>
              </div>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          // Keep folders first in alphabetical sort
          const isFolderA =
            rowA.original.mimeType === "application/vnd.google-apps.folder";
          const isFolderB =
            rowB.original.mimeType === "application/vnd.google-apps.folder";

          if (isFolderA && !isFolderB) return -1;
          if (!isFolderA && isFolderB) return 1;

          return rowA.original.name.localeCompare(rowB.original.name, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        },
      },
      {
        id: "category",
        header: "Tipe",
        cell: ({ row }) => {
          const category = getFileCategory(row.original.mimeType);
          const badgeMap: Record<
            string,
            { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" | "info" | "purple" | "rose" }
          > = {
            folder: { label: "Folder", variant: "warning" },
            document: { label: "Dokumen", variant: "info" },
            spreadsheet: { label: "Spreadsheet", variant: "success" },
            presentation: { label: "Slide", variant: "warning" },
            pdf: { label: "PDF", variant: "rose" },
            image: { label: "Gambar", variant: "purple" },
            video: { label: "Video", variant: "info" },
            archive: { label: "ZIP / Arsip", variant: "secondary" },
            code: { label: "Kode", variant: "outline" },
            file: { label: "Berkas", variant: "secondary" },
          };

          const info = badgeMap[category] || {
            label: "Berkas",
            variant: "secondary",
          };

          return (
            <Badge variant={info.variant} className="text-[11px] font-normal">
              {info.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "size",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-blue-600 transition cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              <span>Ukuran</span>
              {isSorted === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>
          );
        },
        cell: ({ row }) => {
          const isFolder =
            row.original.mimeType === "application/vnd.google-apps.folder";
          return (
            <span className="text-xs text-slate-600 font-mono">
              {isFolder ? "—" : formatBytes(row.original.size)}
            </span>
          );
        },
        sortingFn: (rowA, rowB) => {
          const sizeA = rowA.original.size || 0;
          const sizeB = rowB.original.size || 0;
          return sizeA - sizeB;
        },
      },
      {
        accessorKey: "modifiedTime",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-blue-600 transition cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              <span>Diubah Terakhir</span>
              {isSorted === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
              ) : (
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>
          );
        },
        cell: ({ row }) => {
          return (
            <span className="text-xs text-slate-600 whitespace-nowrap">
              {formatDate(row.original.modifiedTime)}
            </span>
          );
        },
        sortingFn: (rowA, rowB) => {
          const dateA = new Date(rowA.original.modifiedTime).getTime() || 0;
          const dateB = new Date(rowB.original.modifiedTime).getTime() || 0;
          return dateA - dateB;
        },
      },
      {
        id: "owner",
        header: "Pemilik",
        cell: ({ row }) => {
          const owners = row.original.owners;
          const ownerName =
            owners && owners.length > 0 ? owners[0].displayName : "Saya";
          const isShared = row.original.shared;

          return (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="truncate max-w-[120px]">{ownerName}</span>
              {isShared && (
                <span title="Dibagikan" className="text-slate-400">
                  <Users className="h-3 w-3 inline" />
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const file = row.original;
          const isFolder = file.mimeType === "application/vnd.google-apps.folder";

          return (
            <div className="flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    className="h-7 w-7 text-slate-400 hover:text-slate-700"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {isFolder ? (
                    <DropdownMenuItem
                      onClick={() => onOpenFolder(file.id, file.name)}
                    >
                      <Folder className="h-3.5 w-3.5 mr-2 text-amber-500" />
                      Buka Folder
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => onPreviewFile(file)}>
                      <Eye className="h-3.5 w-3.5 mr-2 text-blue-500" />
                      Pratinjau Detail
                    </DropdownMenuItem>
                  )}
                  {file.webViewLink && (
                    <DropdownMenuItem asChild>
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-2 text-slate-500" />
                        Buka di Drive
                      </a>
                    </DropdownMenuItem>
                  )}
                  {file.webViewLink && (
                    <DropdownMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(file.webViewLink!);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-2 text-slate-500" />
                      Salin Tautan
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [onOpenFolder, onPreviewFile]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter: searchQuery,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const name = String(row.original.name || "").toLowerCase();
      const mime = String(row.original.mimeType || "").toLowerCase();
      const search = String(filterValue || "").toLowerCase();
      return name.includes(search) || mime.includes(search);
    },
  });

  const rowCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  return (
    <div className="space-y-3">
      {/* Table Surface Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-blue-50/30 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-36 text-center text-slate-500"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileQuestion className="h-8 w-8 text-slate-300" />
                    <p className="font-medium text-sm text-slate-700">
                      Tidak ada berkas yang cocok
                    </p>
                    <p className="text-xs text-slate-400">
                      Coba ubah kata kunci pencarian atau bersihkan filter.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Headless TanStack Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-1 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span>
            Menampilkan{" "}
            <strong>
              {rowCount === 0
                ? 0
                : pagination.pageIndex * pagination.pageSize + 1}
            </strong>{" "}
            -{" "}
            <strong>
              {Math.min((pagination.pageIndex + 1) * pagination.pageSize, rowCount)}
            </strong>{" "}
            dari <strong>{rowCount}</strong> item
          </span>

          <span className="text-slate-300">|</span>

          {/* Rows per page selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Per halaman:</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {[5, 10, 20, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation pagination buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="iconSm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 text-slate-600 disabled:opacity-40"
            title="Halaman Pertama"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="iconSm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 text-slate-600 disabled:opacity-40"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <span className="px-2 font-medium text-slate-700">
            Halaman {pageCount === 0 ? 0 : pagination.pageIndex + 1} dari{" "}
            {pageCount || 1}
          </span>

          <Button
            variant="outline"
            size="iconSm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 text-slate-600 disabled:opacity-40"
            title="Halaman Selanjutnya"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="iconSm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 text-slate-600 disabled:opacity-40"
            title="Halaman Terakhir"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
