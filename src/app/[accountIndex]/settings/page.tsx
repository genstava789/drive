import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";
import { getSiteSession } from "@/lib/site-auth";

interface SettingsPageProps {
  params: Promise<{ accountIndex: string }>;
}

export const metadata: Metadata = {
  title: "Pengaturan & Kredensial - LeviDrive",
  description:
    "Informasi kredensial Google OAuth 2.0, kapasitas penyimpanan kuota Drive, dan statistik berkas akun aktif.",
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const resolvedParams = await params;
  const accountIndex = parseInt(resolvedParams.accountIndex, 10) || 0;

  // Protect settings page: Admin/Owner only
  const siteSession = await getSiteSession();
  if (!siteSession || siteSession.role !== "admin") {
    redirect(`/${accountIndex}`);
  }

  return <SettingsView accountIndex={accountIndex} />;
}

