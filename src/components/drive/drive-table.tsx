"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { formatBytes, formatDate, getFileCategory, getDownloadUrl } from "@/lib/utils";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  MoreVertical,
  Eye,
  Copy,
  Download,
  ChevronLeft,
  ChevronRight,
  Folder,
  FileQuestion,
  Users,
  LogIn,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signIn } from "next-auth/react";

interface DriveTableProps {
  data: DriveFile[];
  accountIndex?: number;
  searchQuery: string;
  isFiltered?: boolean;
  hasNoAccount?: boolean;
}

export function DriveTable({
  data,
  accountIndex = 0,
  searchQuery,
  isFiltered = false,
  hasNoAccount = false,
}: DriveTableProps) {
  const router = useRouter();

  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const handleRowClick = (file: DriveFile) => {
    const isFolder = file.mimeType === "application/vnd.google-apps.folder";
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`drive_type_${file.id}`, isFolder ? "folder" : "file");
    }
    router.push(`/${accountIndex}/${file.id}${isFolder ? "?type=folder" : ""}`);
  };

  const handleSort = (columnId: string) => {
    setSorting((prev) => {
      const current = prev.find((s) => s.id === columnId);
      if (columnId === "name") {
        return [{ id: "name", desc: current ? !current.desc : false }];
      }
      if (!current) {
        return [{ id: columnId, desc: false }];
      } else if (!current.desc) {
        return [{ id: columnId, desc: true }];
      } else {
        // 3rd click: Revert back to default order!
        return [{ id: "name", desc: false }];
      }
    });
  };

  const columns = useMemo<ColumnDef<DriveFile>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-600 transition cursor-pointer select-none text-xs"
              onClick={() => handleSort("name")}
              title="Urutkan berdasarkan Nama"
            >
              <span>Nama</span>
              {isSorted === "asc" ? (
                <ArrowUp className="h-3 w-3 text-blue-600" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="h-3 w-3 text-blue-600" />
              ) : (
                <ArrowUpDown className="h-3 w-3 text-slate-400" />
              )}
            </button>
          );
        },
        cell: ({ row }) => {
          const file = row.original;
          const isFolder = file.mimeType === "application/vnd.google-apps.folder";

          return (
            <div
              className="flex items-center gap-2.5 py-0.5 cursor-pointer group"
              onClick={() => handleRowClick(file)}
            >
              <div className="shrink-0 transition-transform group-hover:scale-105">
                <FileTypeIcon mimeType={file.mimeType} fileName={file.name} size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate text-xs sm:text-sm">
                  {file.name}
                </p>
                {/* Mobile subtitle showing size and date */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono sm:hidden truncate">
                  <span>{isFolder ? "Folder" : formatBytes(file.size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.modifiedTime)}</span>
                </div>
              </div>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
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
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-600 transition cursor-pointer select-none text-xs"
              onClick={() => handleSort("category")}
              title="Urutkan berdasarkan Tipe (Klik ke-3 untuk kembali ke semula)"
            >
              <span>Tipe</span>
              {isSorted === "asc" ? (
                <ArrowUp className="h-3 w-3 text-blue-600" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="h-3 w-3 text-blue-600" />
              ) : (
                <ArrowUpDown className="h-3 w-3 text-slate-400" />
              )}
            </button>
          );
        },
        cell: ({ row }) => {
          const category = getFileCategory(row.original.mimeType, row.original.name);
          const badgeMap: Record<
            string,
            {
              label: string;
              variant:
                | "default"
                | "secondary"
                | "outline"
                | "success"
                | "warning"
                | "info"
                | "purple"
                | "rose";
            }
          > = {
            folder: { label: "Folder", variant: "warning" },
            document: { label: "Dokumen", variant: "info" },
            spreadsheet: { label: "Spreadsheet", variant: "success" },
            presentation: { label: "Slide", variant: "warning" },
            pdf: { label: "PDF", variant: "rose" },
            image: { label: "Gambar", variant: "purple" },
            video: { label: "Video", variant: "info" },
            archive: { label: "ZIP", variant: "secondary" },
            code: { label: "Kode", variant: "outline" },
            file: { label: "Berkas", variant: "secondary" },
          };

          const info = badgeMap[category] || {
            label: "Berkas",
            variant: "secondary",
          };

          return (
            <div className="flex items-center">
              <Badge variant={info.variant} className="text-[10px] font-normal py-0">
                {info.label}
              </Badge>
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const catA = getFileCategory(rowA.original.mimeType, rowA.original.name);
          const catB = getFileCategory(rowB.original.mimeType, rowB.original.name);
          return catA.localeCompare(catB);
        },
      },
      {
        accessorKey: "size",
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <button
              className="hidden sm:flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-600 transition cursor-pointer select-none text-xs"
              onClick={() => handleSort("size")}
              title="Urutkan berdasarkan Ukuran (Klik ke-3 untuk kembali ke semula)"
            >
              <span>Ukuran</span>
              {isSorted === "asc" ? (
                <ArrowUp className="h-3 w-3 text-blue-600" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="h-3 w-3 text-blue-600" />
              ) : (
                <ArrowUpDown className="h-3 w-3 text-slate-400" />
              )}
            </button>
          );
        },
        cell: ({ row }) => {
          const isFolder =
            row.original.mimeType === "application/vnd.google-apps.folder";
          return (
            <span className="hidden sm:block text-xs text-slate-600 font-mono">
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
              className="hidden md:flex items-center gap-1 font-semibold text-slate-700 hover:text-blue-600 transition cursor-pointer select-none text-xs"
              onClick={() => handleSort("modifiedTime")}
              title="Urutkan berdasarkan Waktu Diubah (Klik ke-3 untuk kembali ke semula)"
            >
              <span>Diubah</span>
              {isSorted === "asc" ? (
                <ArrowUp className="h-3 w-3 text-blue-600" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="h-3 w-3 text-blue-600" />
              ) : (
                <ArrowUpDown className="h-3 w-3 text-slate-400" />
              )}
            </button>
          );
        },
        cell: ({ row }) => {
          return (
            <span className="hidden md:block text-xs text-slate-600 whitespace-nowrap">
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
        header: () => <span className="hidden lg:inline text-xs font-semibold">Pemilik</span>,
        cell: ({ row }) => {
          const owners = row.original.owners;
          const ownerName =
            owners && owners.length > 0 ? owners[0].displayName : "Saya";
          const isShared = row.original.shared;

          return (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600">
              <span className="truncate max-w-[110px]">{ownerName}</span>
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
                    className="h-6 w-6 sm:h-7 sm:w-7 text-slate-400 hover:text-slate-700"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => handleRowClick(file)}>
                    {isFolder ? (
                      <>
                        <Folder className="h-3.5 w-3.5 mr-2 text-amber-500" />
                        Buka Folder
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 mr-2 text-blue-500" />
                        Informasi Berkas
                      </>
                    )}
                  </DropdownMenuItem>
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
                  {!isFolder && (
                    <>
                      <DropdownMenuItem asChild>
                        <a
                          href={getDownloadUrl(file.id, file.name)}
                          target="_blank"
                          rel="noreferrer"
                          download={file.name}
                          className="flex items-center"
                        >
                          <Download className="h-3.5 w-3.5 mr-2 text-blue-500" />
                          Download
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          navigator.clipboard.writeText(getDownloadUrl(file.id, file.name));
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-2 text-slate-500" />
                        Salin URL Unduh
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountIndex, sorting]
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

  const getColumnClass = (columnId: string) => {
    switch (columnId) {
      case "name":
        return "px-3.5 sm:px-4 py-2 sm:py-2.5 text-left";
      case "category":
        return "hidden sm:table-cell px-3.5 sm:px-4 py-2 sm:py-2.5 w-32 min-w-[115px] text-left";
      case "size":
        return "hidden sm:table-cell px-3.5 sm:px-4 py-2 sm:py-2.5 w-28 min-w-[90px] text-left";
      case "modifiedTime":
        return "hidden md:table-cell px-3.5 sm:px-4 py-2 sm:py-2.5 w-36 min-w-[130px] text-left";
      case "owner":
        return "hidden lg:table-cell px-3.5 sm:px-4 py-2 sm:py-2.5 w-32 min-w-[110px] text-left";
      case "actions":
        return "px-2.5 sm:px-3 py-2 sm:py-2.5 w-12 text-right";
      default:
        return "px-3.5 sm:px-4 py-2 sm:py-2.5 text-left";
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Table Surface Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-slate-200/80 bg-[#F8F9FA]/90">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`h-9 text-xs font-semibold text-slate-700 normal-case select-none ${getColumnClass(
                      header.column.id
                    )}`}
                  >
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
                  className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                  onMouseEnter={() => router.prefetch(`/${accountIndex}/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`align-middle ${getColumnClass(
                        cell.column.id
                      )}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : hasNoAccount ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-52 text-center text-slate-500"
                >
                  <div className="flex flex-col items-center justify-center gap-2.5 py-10 px-4">
                    <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                      <LogIn className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <p className="font-semibold text-xs sm:text-sm text-slate-800">
                        Tidak ada daftar file
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                        tidak ada daftar file silahkan login ke akun google drive mu.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1.5">
                      <Button
                        size="sm"
                        onClick={() => signIn("google")}
                        className="h-8.5 px-3.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs flex items-center gap-2 cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                          <path
                            fill="#EA4335"
                            d="M12 5c1.54 0 2.92.54 4.01 1.43l3.01-3.01C17.19 1.77 14.77 1 12 1 7.42 1 3.53 3.61 1.64 7.39l3.66 2.84C6.18 7.35 8.84 5 12 5z"
                          />
                          <path
                            fill="#4285F4"
                            d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.68 2.86c2.14-1.98 3.74-4.89 3.74-8.68z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.3 14.77c-.23-.68-.36-1.41-.36-2.17s.13-1.49.36-2.17L1.64 7.59C.6 9.68 0 12 0 14.4s.6 4.72 1.64 6.81l3.66-2.84z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.68-2.86c-1.07.72-2.45 1.16-4.25 1.16-3.16 0-5.82-2.35-6.7-5.23L1.64 16c1.89 3.78 5.78 6.4 10.36 6.4z"
                          />
                        </svg>
                        <span>Login Akun Google Drive</span>
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : isFiltered || Boolean(searchQuery?.trim()) ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-slate-500"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <FileQuestion className="h-7 w-7 text-slate-300" />
                    <p className="font-medium text-xs text-slate-700">
                      Tidak ada berkas yang cocok
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Coba ubah kata kunci atau bersihkan filter.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-slate-500"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Folder className="h-7 w-7 text-slate-300" />
                    <p className="font-medium text-xs text-slate-700">
                      Folder ini kosong
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Tidak ada berkas atau direktori dalam folder ini.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Headless TanStack Pagination Controls - Responsive & Compact */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600">
        <div className="flex items-center gap-2 text-[11px] sm:text-xs">
          <span>
            <strong>{rowCount}</strong> item
          </span>

          <span className="text-slate-300">|</span>

          {/* Rows per page selector */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 hidden xs:inline">Baris:</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-7 w-7 rounded-md text-slate-600 disabled:opacity-30"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <span className="px-1 text-[11px] sm:text-xs font-medium text-slate-700">
            {pageCount === 0 ? 0 : pagination.pageIndex + 1} / {pageCount || 1}
          </span>

          <Button
            variant="outline"
            size="iconSm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-7 w-7 rounded-md text-slate-600 disabled:opacity-30"
            title="Halaman Selanjutnya"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
