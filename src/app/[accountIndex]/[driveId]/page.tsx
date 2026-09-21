import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getValidAccessTokenForAccount } from "@/lib/server-account-store";
import { getDriveItemById, getFolderBreadcrumbs } from "@/lib/google-drive";
import { DriveExplorer } from "@/components/drive/drive-explorer";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";

interface DriveItemPageProps {
  params: Promise<{ accountIndex: string; driveId: string }>;
}

export default async function DriveItemPage({ params }: DriveItemPageProps) {
  const resolvedParams = await params;
  const accountIndex = parseInt(resolvedParams.accountIndex, 10) || 0;
  const driveId = decodeURIComponent(resolvedParams.driveId);

  // If driveId is the root alias or root drive ID, redirect to home root route
  if (
    driveId === "root" ||
    driveId === "0AAgz7sm0L0i1Uk9PVA"
  ) {
    redirect(`/${accountIndex}`);
  }

  const accessToken = await getValidAccessTokenForAccount(accountIndex);

  // Look up item by Google Drive ID
  const item = await getDriveItemById(driveId, accessToken, accountIndex);

  const isFolder =
    item?.mimeType === "application/vnd.google-apps.folder" ||
    driveId.startsWith("folder-");

  if (isFolder && item?.name?.toLowerCase() === "my drive") {
    redirect(`/${accountIndex}`);
  }

  if (!item) {
    return (
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
    );
  }

  if (isFolder) {
    const breadcrumbs = await getFolderBreadcrumbs(driveId, accessToken, accountIndex);
    return (
      <DriveExplorer
        accountIndex={accountIndex}
        initialFolderId={driveId}
        initialFolderName={item.name}
        initialBreadcrumbs={breadcrumbs}
      />
    );
  }

  // Non-folder items smoothly redirect to dedicated file route
  redirect(`/${accountIndex}/file/${encodeURIComponent(driveId)}`);
}
