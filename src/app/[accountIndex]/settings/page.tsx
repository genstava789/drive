import React from "react";
import { Metadata } from "next";
import { SettingsView } from "@/components/settings/settings-view";

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

  return <SettingsView accountIndex={accountIndex} />;
}
