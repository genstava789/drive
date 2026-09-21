import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDriveItemById } from "@/lib/google-drive";
import { UserNav } from "@/components/auth/user-nav";
import { DriveExplorer } from "@/components/drive/drive-explorer";
import { FileDetailView } from "@/components/drive/file-detail-view";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";

interface DriveItemPageProps {
  params: Promise<{ accountIndex: string; driveId: string }>;
}

export default async function DriveItemPage({ params }: DriveItemPageProps) {
  const resolvedParams = await params;
  const accountIndex = parseInt(resolvedParams.accountIndex, 10) || 0;
  const driveId = decodeURIComponent(resolvedParams.driveId);

  const session = await auth();
  let accessToken = session?.accessToken;
  if (session?.accounts && session.accounts[accountIndex]?.accessToken) {
    accessToken = session.accounts[accountIndex].accessToken;
  }

  // Look up item by Google Drive ID
  const item = await getDriveItemById(driveId, accessToken);

  const isFolder =
    item?.mimeType === "application/vnd.google-apps.folder" ||
    driveId.startsWith("folder-");

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F9] text-slate-800">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand Logo - LeviDrive */}
          <Link href={`/${accountIndex}`} className="flex items-center">
            <span className="font-outfit text-xl sm:text-2xl font-black tracking-tight text-slate-900 select-none">
              Levi<span className="text-blue-600">Drive</span>
            </span>
          </Link>

          {/* User Profile & Multi-Account Navigation */}
          <UserNav accountIndex={accountIndex} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5">
        {!item ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-xs">
            <FileQuestion className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-3 text-base font-bold text-slate-800">
              Berkas atau Folder Tidak Ditemukan
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
              ID berkas &quot;{driveId}&quot; tidak dapat ditemukan pada akun Google ini.
            </p>
            <div className="mt-5">
              <Link href={`/${accountIndex}`}>
                <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700">
                  <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke My Drive
                </Button>
              </Link>
            </div>
          </div>
        ) : isFolder ? (
          /* Folder navigation: Renders DriveExplorer inside this subfolder */
          <DriveExplorer
            accountIndex={accountIndex}
            initialFolderId={driveId}
            initialFolderName={item.name}
          />
        ) : (
          /* File navigation: Renders dedicated full-page file information view */
          <FileDetailView file={item} accountIndex={accountIndex} />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="mt-auto border-t border-slate-200/70 bg-white py-4 text-center">
        <p className="text-xs text-slate-500 font-medium tracking-wide">
          Made with love by Levi
        </p>
      </footer>
    </div>
  );
}
