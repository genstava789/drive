import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CloudVault • Google Drive Explorer",
  description:
    "Jelajahi, urutkan, dan kelola berkas & folder Google Drive secara cepat dan elegan dengan tema White Smoke dan TanStack Table.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${plusJakarta.variable} antialiased`}>
      <body className="min-h-screen bg-[#F6F7F9] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
