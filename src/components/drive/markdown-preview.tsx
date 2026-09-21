"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { DriveFile } from "@/types/drive";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileCode,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Code2,
  Eye,
  FileText,
  Terminal,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface MarkdownPreviewProps {
  file: DriveFile;
}

export function MarkdownPreview({ file }: MarkdownPreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "raw">("preview");
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // High-fidelity Markdown content representing LeviDrive documentation
  const sampleMarkdown = `# LeviDrive - Google Drive Explorer Next.js 15+

> [!NOTE]
> Aplikasi penjelajah berkas Google Drive modern dengan tema **White Smoke**, sorting headless TanStack Table v8, integrasi multi-akun, dan pratinjau berkas interaktif.

---

## Fitur Utama

- [x] **Multi-Account Login**: Dukungan login beberapa akun Google sekaligus (\`/0\`, \`/1\`).
- [x] **Individual Logout**: Tombol keluar mandiri untuk setiap akun Google atau akun demo.
- [x] **Empty State Auto-Detection**: Tampilan tabel kosong informatif saat seluruh akun di-logout.
- [x] **TanStack Table Headless**: Sorting nama berkas, ukuran, waktu diubah, dan tipe berkas yang responsif.
- [x] **LightBox Image Slides**: Integrasi \`yet-another-react-lightbox\` untuk pratinjau foto dan galeri folder.
- [x] **PDF & Markdown Native Preview**: Pratinjau dokumen PDF dan Markdown langsung di peramban.

---

## Arsitektur Teknis

| Komponen | Versi / Spesifikasi | Keterangan |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3+ (App Router) | Server Components & Edge Rendering |
| **Styling** | Tailwind CSS v4 | Tema Elegan White Smoke |
| **Table Engine** | TanStack Table v8 | Sorting, Filtering, Pagination Headless |
| **Authentication**| NextAuth v5 (Auth.js) | OAuth 2.0 Google Drive API v3 |
| **Font Family** | Outfit & Plus Jakarta Sans | Google Fonts Typography |

---

## Konfigurasi Environment (\`.env.local\`)

Gunakan kredensial resmi dari Google Cloud Console:

\`\`\`bash
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
AUTH_SECRET="your-random-secure-auth-secret-key"
NEXTAUTH_URL="https://drive-iota-vert.vercel.app"
AUTH_URL="https://drive-iota-vert.vercel.app"
\`\`\`

---

## Panduan Eksekusi

\`\`\`typescript
// Jalankan server pengembangan
npm run dev

// Jalankan verifikasi production build
npm run build
\`\`\`

> [!TIP]
> Navigasi rute folder menggunakan URL langsung \`/[accountIndex]/[folderId]\` untuk kemudahan penandaan (bookmarking) dan performa prefetch instan.
`;

  const lines = sampleMarkdown.split("\n");
  const wordCount = sampleMarkdown.trim().split(/\s+/).length;
  const lineCount = lines.length;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(sampleMarkdown);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-xs transition-all ${
        isFullscreen
          ? "fixed inset-2 z-50 flex flex-col shadow-2xl bg-white"
          : "relative"
      }`}
    >
      {/* Markdown Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200/80 text-xs">
        {/* File Info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 font-bold shrink-0">
            <FileCode className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate text-[11px] sm:text-xs">
              {file.name}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Markdown • {lineCount} baris • {wordCount} kata
            </p>
          </div>
        </div>

        {/* View Mode Tabs & Copy */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Tab Switcher */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition cursor-pointer ${
                activeTab === "preview"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="h-3 w-3" />
              <span>Pratinjau Format</span>
            </button>
            <button
              onClick={() => setActiveTab("raw")}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition cursor-pointer ${
                activeTab === "raw"
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code2 className="h-3 w-3" />
              <span>Kode Mentah</span>
            </button>
          </div>

          {/* Copy Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyMarkdown}
            className="h-7 px-2.5 text-[11px] gap-1 text-slate-700 cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span className="hidden sm:inline">Salin Konten</span>
              </>
            )}
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 w-7 text-slate-500 hover:text-slate-900 cursor-pointer"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Markdown Content Area */}
      <div
        className={`overflow-auto p-4 sm:p-6 bg-white ${
          isFullscreen ? "flex-1" : "min-h-[380px] max-h-[560px]"
        }`}
      >
        {activeTab === "preview" ? (
          /* Dynamic Markdown Rendering via react-markdown */
          <div className="max-w-3xl mx-auto space-y-4 text-slate-800 text-xs sm:text-sm select-text">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-200 pb-3 mb-3">
                    <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />
                    <span>{children}</span>
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-1.5 pt-3 mb-2 flex items-center gap-1.5">
                    <span>{children}</span>
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-bold text-slate-900 pt-2 mb-1">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-2.5">
                    {children}
                  </p>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="rounded-lg border-l-4 border-blue-600 bg-blue-50/60 p-3 text-xs sm:text-sm text-blue-950 my-3">
                    {children}
                  </blockquote>
                ),
                ul: ({ children }) => (
                  <ul className="space-y-1.5 my-2 text-xs sm:text-sm text-slate-700 pl-4 list-disc">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="space-y-1.5 my-2 text-xs sm:text-sm text-slate-700 pl-4 list-decimal">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {children}
                  </li>
                ),
                code: ({ className, children }) => {
                  const isBlock = className || (typeof children === "string" && children.includes("\n"));
                  return isBlock ? (
                    <div className="rounded-lg bg-slate-900 text-slate-100 p-3.5 font-mono text-xs overflow-x-auto shadow-inner my-2.5">
                      <code>{children}</code>
                    </div>
                  ) : (
                    <code className="px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 font-mono text-[11px] sm:text-xs">
                      {children}
                    </code>
                  );
                },
                table: ({ children }) => (
                  <div className="rounded-lg border border-slate-200 overflow-hidden shadow-2xs my-3">
                    <table className="w-full text-left text-xs">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-slate-100">
                    {children}
                  </tbody>
                ),
                th: ({ children }) => (
                  <th className="p-2.5 font-semibold text-slate-900">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="p-2.5 text-slate-700">
                    {children}
                  </td>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-4 border-slate-200" />,
              }}
            >
              {sampleMarkdown}
            </ReactMarkdown>
          </div>
        ) : (
          /* Raw Markdown Viewer with Line Numbers */
          <div className="rounded-lg bg-slate-950 text-slate-100 p-4 font-mono text-xs overflow-x-auto shadow-inner select-text">
            <div className="space-y-1">
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-4">
                  <span className="text-slate-600 select-none w-8 text-right shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-slate-200 whitespace-pre">
                    {line || " "}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
