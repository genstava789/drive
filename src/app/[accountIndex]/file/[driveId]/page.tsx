import React from "react";
import Link from "next/link";
import { getValidAccessTokenForAccount } from "@/lib/server-account-store";
import { getDriveItemById, getFolderBreadcrumbs } from "@/lib/google-drive";
import { FileDetailView } from "@/components/drive/file-detail-view";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { BreadcrumbItem } from "@/types/drive";

interface FilePageProps {
  params: Promise<{ accountIndex: string; driveId: string }>;
}

export default async function FilePage({ params }: FilePageProps) {
  const resolvedParams = await params;
  const accountIndex = parseInt(resolvedParams.accountIndex, 10) || 0;
  const driveId = decodeURIComponent(resolvedParams.driveId);

  const accessToken = await getValidAccessTokenForAccount(accountIndex);
  const item = await getDriveItemById(driveId, accessToken, accountIndex);

  if (!item) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-xs">
        <FileQuestion className="mx-auto h-12 w-12 text-slate-300" />
        <h2 className="mt-3 text-base font-bold text-slate-800">
          Berkas Tidak Ditemukan
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

  let initialBreadcrumbs: BreadcrumbItem[] | undefined;
  const parentId = item.parents?.[0];
  if (parentId && parentId !== "root") {
    try {
      initialBreadcrumbs = await getFolderBreadcrumbs(
        parentId,
        accessToken,
        accountIndex
      );
    } catch (_) {}
  }

  return (
    <FileDetailView
      file={item}
      accountIndex={accountIndex}
      initialBreadcrumbs={initialBreadcrumbs}
    />
  );
}
