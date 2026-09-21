import { DriveFile, GoogleAccount } from "@/types/drive";

export const MOCK_ACCOUNTS: GoogleAccount[] = [
  {
    id: "acc-0",
    name: "Levi Utama",
    email: "levi.primary@gmail.com",
    image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "acc-1",
    name: "Levi Workspace",
    email: "levi.work@company.com",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80",
  },
];

export const MOCK_ROOT_FILES_ACC_0: DriveFile[] = [
  {
    id: "folder-proyek-q3",
    name: "Laporan Proyek Kuartal 3 - 2026",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: "2026-09-18T10:45:00Z",
    createdTime: "2026-08-01T08:00:00Z",
    shared: true,
    owners: [{ displayName: "Budi Santoso", emailAddress: "budi@example.com" }],
    webViewLink: "https://drive.google.com/drive/folders/folder-proyek-q3",
    webContentLink: "https://drive.google.com/uc?export=download&id=folder-proyek-q3",
  },
  {
    id: "folder-desain-ui",
    name: "Aset & Dokumentasi Desain UI",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: "2026-09-19T14:20:00Z",
    createdTime: "2026-07-15T09:30:00Z",
    shared: false,
    owners: [{ displayName: "Levi Utama", me: true }],
    webViewLink: "https://drive.google.com/drive/folders/folder-desain-ui",
    webContentLink: "https://drive.google.com/uc?export=download&id=folder-desain-ui",
  },
  {
    id: "folder-arsip-keuangan",
    name: "Arsip Keuangan & Tagihan",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: "2026-09-15T11:10:00Z",
    createdTime: "2026-06-10T12:00:00Z",
    shared: true,
    owners: [{ displayName: "Fintech Finance", emailAddress: "finance@example.com" }],
    webViewLink: "https://drive.google.com/drive/folders/folder-arsip-keuangan",
    webContentLink: "https://drive.google.com/uc?export=download&id=folder-arsip-keuangan",
  },
  {
    id: "file-proposal-bisnis-2026",
    name: "Proposal_Pengembangan_Sistem_2026.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 2450000, // 2.45 MB
    modifiedTime: "2026-09-20T16:30:00Z",
    createdTime: "2026-09-02T10:00:00Z",
    shared: false,
    owners: [{ displayName: "Levi Utama", me: true }],
    webViewLink: "https://docs.google.com/document/d/file-proposal-bisnis-2026",
    webContentLink: "https://drive.google.com/uc?export=download&id=file-proposal-bisnis-2026",
  },
  {
    id: "file-anggaran-tahunan",
    name: "Rekapitulasi_Anggaran_Tahunan.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 8430000, // 8.43 MB
    modifiedTime: "2026-09-19T08:15:00Z",
    createdTime: "2026-08-10T14:20:00Z",
    shared: true,
    owners: [{ displayName: "Siti Rahma", emailAddress: "siti@example.com" }],
    webViewLink: "https://docs.google.com/spreadsheets/d/file-anggaran-tahunan",
    webContentLink: "https://drive.google.com/uc?export=download&id=file-anggaran-tahunan",
  },
  {
    id: "file-slide-pitch-deck",
    name: "Investor_Pitch_Deck_Antigravity.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    size: 19800000, // 19.8 MB
    modifiedTime: "2026-09-17T09:00:00Z",
    createdTime: "2026-08-25T11:00:00Z",
    shared: true,
    owners: [{ displayName: "Levi Utama", me: true }],
    webViewLink: "https://docs.google.com/presentation/d/file-slide-pitch-deck",
    webContentLink: "https://drive.google.com/uc?export=download&id=file-slide-pitch-deck",
  },
  {
    id: "file-panduan-arsitektur-pdf",
    name: "Whitepaper_Arsitektur_Cloud_Native.pdf",
    mimeType: "application/pdf",
    size: 5120000, // 5.12 MB
    modifiedTime: "2026-09-14T13:45:00Z",
    createdTime: "2026-07-20T15:30:00Z",
    shared: false,
    owners: [{ displayName: "Levi Utama", me: true }],
    webViewLink: "https://drive.google.com/file/d/file-panduan-arsitektur-pdf",
    webContentLink: "https://drive.google.com/uc?export=download&id=file-panduan-arsitektur-pdf",
  },
  {
    id: "file-mockup-dashboard-png",
    name: "Mockup_Dashboard_WhiteSmoke_v2.png",
    mimeType: "image/png",
    size: 3840000, // 3.84 MB
    modifiedTime: "2026-09-20T17:10:00Z",
    createdTime: "2026-09-19T09:00:00Z",
    shared: false,
    owners: [{ displayName: "Levi Utama", me: true }],
    webViewLink: "https://drive.google.com/file/d/file-mockup-dashboard-png",
    webContentLink: "https://drive.google.com/uc?export=download&id=file-mockup-dashboard-png",
    thumbnailLink: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: "file-demo-video-mp4",
    name: "Walkthrough_Aplikasi_NextJS15.mp4",
    mimeType: "video/mp4",
    size: 142000000, // 142 MB
    modifiedTime: "2026-09-12T19:00:00Z",
    createdTime: "2026-09-10T18:00:00Z",
    shared: true,
    owners: [{ displayName: "Rian Pratama", emailAddress: "rian@example.com" }],
    webViewLink: "https://drive.google.com/file/d/file-demo-video-mp4",
    webContentLink: "https://drive.google.com/uc?export=download&id=file-demo-video-mp4",
  },
];

export const MOCK_ROOT_FILES_ACC_1: DriveFile[] = [
  {
    id: "folder-engineering-specs",
    name: "Spesifikasi Engineering & Infra",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: "2026-09-21T02:00:00Z",
    createdTime: "2026-08-15T08:00:00Z",
    shared: true,
    owners: [{ displayName: "DevOps Team", emailAddress: "devops@company.com" }],
    webViewLink: "https://drive.google.com/drive/folders/folder-engineering-specs",
    webContentLink: "https://drive.google.com/uc?export=download&id=folder-engineering-specs",
  },
  {
    id: "folder-legal-kontrak",
    name: "Legal Kontrak Kerja Sama Mitra",
    mimeType: "application/vnd.google-apps.folder",
    modifiedTime: "2026-09-19T09:30:00Z",
    createdTime: "2026-07-20T10:00:00Z",
    shared: false,
    owners: [{ displayName: "Levi Workspace", me: true }],
    webViewLink: "https://drive.google.com/drive/folders/folder-legal-kontrak",
    webContentLink: "https://drive.google.com/uc?export=download&id=folder-legal-kontrak",
  },
  {
    id: "file-database-backup-sql",
    name: "Production_Database_Dump_2026.sql.gz",
    mimeType: "application/gzip",
    size: 840000000, // 840 MB
    modifiedTime: "2026-09-21T04:15:00Z",
    createdTime: "2026-09-21T04:00:00Z",
    shared: false,
    owners: [{ displayName: "Levi Workspace", me: true }],
    webViewLink: "https://drive.google.com/file/d/file-database-backup-sql",
    webContentLink: "https://drive.google.com/uc?export=download&id=file-database-backup-sql",
  },
  {
    id: "file-arsitektur-microservices",
    name: "Dokumen_Arsitektur_Microservices_v3.pdf",
    mimeType: "application/pdf",
    size: 12400000, // 12.4 MB
    modifiedTime: "2026-09-20T11:20:00Z",
    createdTime: "2026-08-28T09:00:00Z",
    shared: true,
    owners: [{ displayName: "Arsitek Cloud", emailAddress: "cloud@company.com" }],
    webViewLink: "https://drive.google.com/file/d/file-arsitektur-microservices",
    webContentLink: "https://drive.google.com/uc?export=download&id=file-arsitektur-microservices",
  },
  {
    id: "file-rekap-payroll-q3",
    name: "Rekapitulasi_Payroll_Engineering_Q3.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size: 3200000,
    modifiedTime: "2026-09-18T16:00:00Z",
    createdTime: "2026-09-01T12:00:00Z",
    shared: false,
    owners: [{ displayName: "Levi Workspace", me: true }],
    webViewLink: "https://docs.google.com/spreadsheets/d/file-rekap-payroll-q3",
    webContentLink: "https://drive.google.com/uc?export=download&id=file-rekap-payroll-q3",
  },
];

export const MOCK_SUBFOLDER_FILES: Record<string, DriveFile[]> = {
  "folder-proyek-q3": [
    {
      id: "subfile-timeline-q3",
      name: "Timeline_Eksekusi_Proyek_Q3.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 4150000,
      modifiedTime: "2026-09-18T10:45:00Z",
      createdTime: "2026-09-01T08:00:00Z",
      parents: ["folder-proyek-q3"],
      shared: true,
      owners: [{ displayName: "Budi Santoso" }],
      webViewLink: "https://docs.google.com/spreadsheets/d/subfile-timeline-q3",
      webContentLink: "https://drive.google.com/uc?export=download&id=subfile-timeline-q3",
    },
    {
      id: "subfile-status-sprint",
      name: "Catatan_Sprint_Review_12.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 1120000,
      modifiedTime: "2026-09-17T16:20:00Z",
      createdTime: "2026-09-15T09:00:00Z",
      parents: ["folder-proyek-q3"],
      shared: false,
      owners: [{ displayName: "Levi Utama", me: true }],
      webViewLink: "https://docs.google.com/document/d/subfile-status-sprint",
      webContentLink: "https://drive.google.com/uc?export=download&id=subfile-status-sprint",
    },
    {
      id: "subfile-arsip-asset-q3",
      name: "Diagram_Arsitektur_Sistem_Q3.png",
      mimeType: "image/png",
      size: 2850000,
      modifiedTime: "2026-09-16T12:00:00Z",
      createdTime: "2026-09-10T11:00:00Z",
      parents: ["folder-proyek-q3"],
      shared: true,
      owners: [{ displayName: "Levi Utama", me: true }],
      webViewLink: "https://drive.google.com/file/d/subfile-arsip-asset-q3",
      webContentLink: "https://drive.google.com/uc?export=download&id=subfile-arsip-asset-q3",
      thumbnailLink: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60",
    },
  ],
  "folder-desain-ui": [
    {
      id: "subfile-wireframe-figma",
      name: "Export_Figma_Komponen_UI.pdf",
      mimeType: "application/pdf",
      size: 15400000,
      modifiedTime: "2026-09-19T14:20:00Z",
      createdTime: "2026-09-12T10:00:00Z",
      parents: ["folder-desain-ui"],
      shared: false,
      owners: [{ displayName: "Levi Utama", me: true }],
      webViewLink: "https://drive.google.com/file/d/subfile-wireframe-figma",
      webContentLink: "https://drive.google.com/uc?export=download&id=subfile-wireframe-figma",
    },
    {
      id: "subfile-palet-warna-whitesmoke",
      name: "Token_Color_WhiteSmoke_Guide.pdf",
      mimeType: "application/pdf",
      size: 3200000,
      modifiedTime: "2026-09-18T09:00:00Z",
      createdTime: "2026-09-15T08:00:00Z",
      parents: ["folder-desain-ui"],
      shared: false,
      owners: [{ displayName: "Levi Utama", me: true }],
      webViewLink: "https://drive.google.com/file/d/subfile-palet-warna-whitesmoke",
      webContentLink: "https://drive.google.com/uc?export=download&id=subfile-palet-warna-whitesmoke",
    },
  ],
  "folder-engineering-specs": [
    {
      id: "subfile-k8s-manifest",
      name: "Kubernetes_Helm_Values_Production.yaml",
      mimeType: "text/yaml",
      size: 45000,
      modifiedTime: "2026-09-21T02:00:00Z",
      createdTime: "2026-09-20T10:00:00Z",
      parents: ["folder-engineering-specs"],
      shared: true,
      owners: [{ displayName: "DevOps Team" }],
      webViewLink: "https://drive.google.com/file/d/subfile-k8s-manifest",
      webContentLink: "https://drive.google.com/uc?export=download&id=subfile-k8s-manifest",
    },
  ],
};

export const MOCK_FOLDER_NAMES: Record<string, string> = {
  root: "My Drive",
  "folder-proyek-q3": "Laporan Proyek Kuartal 3 - 2026",
  "folder-desain-ui": "Aset & Dokumentasi Desain UI",
  "folder-arsip-keuangan": "Arsip Keuangan & Tagihan",
  "folder-engineering-specs": "Spesifikasi Engineering & Infra",
  "folder-legal-kontrak": "Legal Kontrak Kerja Sama Mitra",
};

// Helper to look up any file by ID across mock datasets
export function findMockItemById(id: string): DriveFile | undefined {
  const allFiles: DriveFile[] = [
    ...MOCK_ROOT_FILES_ACC_0,
    ...MOCK_ROOT_FILES_ACC_1,
    ...Object.values(MOCK_SUBFOLDER_FILES).flat(),
  ];

  const found = allFiles.find((f) => f.id === id);
  if (found) return found;

  if (MOCK_FOLDER_NAMES[id]) {
    return {
      id,
      name: MOCK_FOLDER_NAMES[id],
      mimeType: "application/vnd.google-apps.folder",
      modifiedTime: new Date().toISOString(),
      createdTime: new Date().toISOString(),
      webViewLink: `https://drive.google.com/drive/folders/${id}`,
    };
  }

  return undefined;
}
