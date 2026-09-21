import { NextRequest, NextResponse } from "next/server";
import { getServerAccounts } from "@/lib/server-account-store";
import { syncDriveChangesForAccount } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

/**
 * Endpoint for Background / Cron Sync or manual on-demand sync.
 * Incrementally syncs Google Drive changes into Supabase files_cache using changes.list().
 *
 * Usage:
 * - GET /api/drive/sync (Syncs all active accounts)
 * - GET /api/drive/sync?accountIndex=0 (Syncs account index 0)
 * - POST /api/drive/sync (Triggerable by Vercel Cron or webhook)
 */
export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const accountIndexParam = searchParams.get("accountIndex");

  try {
    const accounts = await getServerAccounts();
    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ada akun Google Drive yang terhubung",
          durationMs: Date.now() - startTime,
        },
        { status: 200 }
      );
    }

    // Specific account sync
    if (accountIndexParam !== null && accountIndexParam !== "") {
      const idx = parseInt(accountIndexParam, 10) || 0;
      if (idx < 0 || idx >= accounts.length) {
        return NextResponse.json(
          {
            success: false,
            message: `Index akun ${idx} tidak ditemukan (total: ${accounts.length})`,
          },
          { status: 400 }
        );
      }

      const syncResult = await syncDriveChangesForAccount(idx);
      return NextResponse.json(
        {
          ...syncResult,
          accountIndex: idx,
          accountEmail: accounts[idx]?.email,
          durationMs: Date.now() - startTime,
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // All accounts sync
    const results = [];
    for (let i = 0; i < accounts.length; i++) {
      const res = await syncDriveChangesForAccount(i);
      results.push({
        accountIndex: i,
        accountEmail: accounts[i]?.email,
        ...res,
      });
    }

    return NextResponse.json(
      {
        success: true,
        accountsSynced: results.length,
        results,
        durationMs: Date.now() - startTime,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[Sync API] Execution error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Gagal menjalankan sinkronisasi",
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
