import React from "react";
import { DriveExplorer } from "@/components/drive/drive-explorer";

interface AccountPageProps {
  params: Promise<{ accountIndex: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const resolvedParams = await params;
  const accountIndex = parseInt(resolvedParams.accountIndex, 10) || 0;

  return <DriveExplorer accountIndex={accountIndex} />;
}
