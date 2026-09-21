"use client";

import React, { useEffect, useState } from "react";
import { FileDetailSkeleton } from "@/components/drive/file-detail-skeleton";

export default function FileLoading() {
  const [navState, setNavState] = useState(() => {
    let driveId = "";
    let accountIndex = 0;
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      accountIndex = parts[0] ? parseInt(parts[0], 10) || 0 : 0;
      // URL pattern is /[accountIndex]/file/[driveId] -> parts[2] is driveId
      if (parts[2]) {
        driveId = decodeURIComponent(parts[2]);
      } else {
        const stored = sessionStorage.getItem("drive_navigating_id");
        if (stored) driveId = stored;
      }
    }
    return { accountIndex, driveId };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const parts = window.location.pathname.split("/").filter(Boolean);
    const accIdx = parts[0] ? parseInt(parts[0], 10) || 0 : 0;
    const dId = parts[2]
      ? decodeURIComponent(parts[2])
      : sessionStorage.getItem("drive_navigating_id") || "";
    setNavState({ accountIndex: accIdx, driveId: dId });
  }, []);

  return (
    <FileDetailSkeleton
      accountIndex={navState.accountIndex}
      driveId={navState.driveId}
    />
  );
}
