import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getServerAccounts,
  getServerStoreState,
  getValidAccessTokenForAccount,
} from "@/lib/server-account-store";
import { getGoogleCredentials } from "@/lib/auth-credentials";
import { getSiteSession } from "@/lib/site-auth";

// In-memory cache for settings and quota (TTL 30 seconds)
interface CachedSettings {
  data: any;
  timestamp: number;
}
const settingsCache = new Map<number, CachedSettings>();
const SETTINGS_CACHE_TTL_MS = 30000;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const siteSession = await getSiteSession();
    if (siteSession?.role !== "admin") {
      return NextResponse.json(
        { error: "Akses ditolak. Pengaturan hanya dapat diakses oleh Owner/Admin." },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const accountIndex = parseInt(searchParams.get("accountIndex") || "0", 10) || 0;
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!forceRefresh) {
      const cached = settingsCache.get(accountIndex);
      if (cached && Date.now() - cached.timestamp < SETTINGS_CACHE_TTL_MS) {
        return NextResponse.json(cached.data);
      }
    }

    // 1. Authoritative server check
    const serverState = await getServerStoreState();
    if (serverState.loggedOut || !serverState.accounts || serverState.accounts.length === 0) {
      return NextResponse.json({
        isAuthenticated: false,
        error: "Tidak ada sesi akun aktif yang login",
      });
    }

    const session = await auth();
    const accounts = await getServerAccounts();
    const account =
      accounts[accountIndex] ||
      accounts[0] ||
      (session?.accounts ? session.accounts[accountIndex] : null);

    if (!account) {
      return NextResponse.json({
        isAuthenticated: false,
        error: "Akun Google tidak ditemukan",
      });
    }

    const creds = getGoogleCredentials();
    const effectiveRefreshToken =
      account.refreshToken || process.env.GOOGLE_REFRESH_TOKEN || "";

    const effectiveToken = await getValidAccessTokenForAccount(accountIndex);

    let storageQuota = {
      limit: 0,
      usage: 0,
      usageInDrive: 0,
      usageInDriveTrash: 0,
      percentUsed: 0,
    };
    let userInfo = {
      displayName: account.name || "Google User",
      emailAddress: account.email || "",
      photoLink: account.image || "",
    };
    let totalFiles = 0;
    let totalFolders = 0;
    let totalTrash = 0;

    if (effectiveToken) {
      try {
        // 2. Fetch storage quota and user info from Google Drive API
        const aboutRes = await fetch(
          "https://www.googleapis.com/drive/v3/about?fields=user,storageQuota",
          {
            headers: { Authorization: `Bearer ${effectiveToken}` },
            cache: "no-store",
          }
        );

        if (aboutRes.ok) {
          const aboutData = await aboutRes.json();
          if (aboutData.storageQuota) {
            const limit = parseInt(aboutData.storageQuota.limit || "0", 10);
            const usage = parseInt(aboutData.storageQuota.usage || "0", 10);
            const usageInDrive = parseInt(
              aboutData.storageQuota.usageInDrive || "0",
              10
            );
            const usageInDriveTrash = parseInt(
              aboutData.storageQuota.usageInDriveTrash || "0",
              10
            );
            const percentUsed =
              limit > 0 ? Number(((usage / limit) * 100).toFixed(1)) : 0;

            storageQuota = {
              limit,
              usage,
              usageInDrive,
              usageInDriveTrash,
              percentUsed,
            };
          }

          if (aboutData.user) {
            userInfo = {
              displayName:
                aboutData.user.displayName || userInfo.displayName,
              emailAddress:
                aboutData.user.emailAddress || userInfo.emailAddress,
              photoLink: aboutData.user.photoLink || userInfo.photoLink,
            };
          }
        }
      } catch (err) {
        console.warn("[SettingsAPI] Error fetching about.get:", err);
      }

      try {
        // 3. Fast count of active files & folders (pageSize 1000)
        const filesRes = await fetch(
          "https://www.googleapis.com/drive/v3/files?q=trashed = false&pageSize=1000&fields=nextPageToken,files(id,mimeType)",
          {
            headers: { Authorization: `Bearer ${effectiveToken}` },
            cache: "no-store",
          }
        );
        if (filesRes.ok) {
          const filesData = await filesRes.json();
          const items = filesData.files || [];
          for (const item of items) {
            if (item.mimeType === "application/vnd.google-apps.folder") {
              totalFolders++;
            } else {
              totalFiles++;
            }
          }
        }
      } catch (err) {
        console.warn("[SettingsAPI] Error counting files:", err);
      }

      try {
        // 4. Fast count of trash items
        const trashRes = await fetch(
          "https://www.googleapis.com/drive/v3/files?q=trashed = true&pageSize=1000&fields=files(id)",
          {
            headers: { Authorization: `Bearer ${effectiveToken}` },
            cache: "no-store",
          }
        );
        if (trashRes.ok) {
          const trashData = await trashRes.json();
          totalTrash = (trashData.files || []).length;
        }
      } catch (err) {
        console.warn("[SettingsAPI] Error counting trash:", err);
      }
    }

    const responsePayload = {
      isAuthenticated: true,
      accountIndex,
      account: {
        id: account.id || account.email,
        name: userInfo.displayName,
        email: userInfo.emailAddress,
        image: userInfo.photoLink,
      },
      credentials: {
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        refreshToken: effectiveRefreshToken,
        source: creds.source,
      },
      storage: storageQuota,
      stats: {
        totalFiles,
        totalFolders,
        totalTrash,
      },
      timestamp: Date.now(),
    };

    settingsCache.set(accountIndex, {
      data: responsePayload,
      timestamp: Date.now(),
    });

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("API /api/drive/settings error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengambil data pengaturan" },
      { status: 500 }
    );
  }
}
