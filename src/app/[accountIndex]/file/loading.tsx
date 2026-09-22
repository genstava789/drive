"use client";

import React, { useEffect, useState } from "react";
import { FileDetailSkeleton } from "@/components/drive/file-detail-skeleton";

export default function FileGroupLoading() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [driveId, setDriveId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const parts = window.location.pathname.split("/").filter(Boolean);
    const accIdx = parts[0] ? parseInt(parts[0], 10) || 0 : 0;
    const dId =
      parts[2] ? decodeURIComponent(parts[2]) : sessionStorage.getItem("drive_navigating_id") || "";
    setAccountIndex(accIdx);
    setDriveId(dId);
  }, []);

  return <FileDetailSkeleton accountIndex={accountIndex} driveId={driveId} />;
}
