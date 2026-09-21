"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface BrandLogoProps {
  accountIndex: number;
}

export function BrandLogo({ accountIndex }: BrandLogoProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("drive_navigating_id", "root");
      sessionStorage.setItem("drive_navigating_type", "folder");
      sessionStorage.setItem("drive_type_root", "folder");

      // Notify DriveExplorer if mounted to immediately reset to root folder
      window.dispatchEvent(new CustomEvent("levidrive_navigate_root"));
    }

    // If currently on an inner route (like /file/... or /settings or /[driveId]), ensure clean navigation to root
    const rootPath = `/${accountIndex}`;
    if (pathname !== rootPath) {
      router.push(rootPath);
    }
  };

  return (
    <Link
      href={`/${accountIndex}`}
      onClick={handleLogoClick}
      className="flex items-center group cursor-pointer select-none"
      title="Kembali ke Root Drive (My Drive)"
    >
      <span className="font-outfit text-xl sm:text-2xl font-black tracking-tight text-slate-900 select-none transition-transform group-hover:scale-[1.01]">
        Levi<span className="text-blue-600">Drive</span>
      </span>
    </Link>
  );
}
