import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getDriveFiles,
  getDriveItemById,
  getFolderBreadcrumbs,
  syncDriveChangesForAccount,
} from "@/lib/google-drive";
import {
  getServerStoreState,
  getServerAccounts,
  getValidAccessTokenForAccount,
  getEnvProvisionedAccount,
} from "@/lib/server-account-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get("id");
    const folderId = searchParams.get("folderId") || "root";
    const accountIndexParam = searchParams.get("accountIndex") || "0";
    const accountIndex = parseInt(accountIndexParam, 10) || 0;
    const forceRefresh =
      searchParams.get("refresh") === "true" ||
      searchParams.get("demo") === "true";

    const [session, serverState, serverAccounts] = await Promise.all([
      auth(),
      getServerStoreState(),
      getServerAccounts(),
    ]);
    const envAcc = getEnvProvisionedAccount();

    const hasSessionAuth = Boolean(session?.user || session?.accessToken);
    const hasServerAuth = Boolean(
      serverAccounts.length > 0 ||
      (serverState.accounts && serverState.accounts.length > 0) ||
      envAcc
    );

    // Only reject if completely unauthenticated across both browser session and server store
    if (!hasSessionAuth && !hasServerAuth && serverState.loggedOut) {
      return NextResponse.json(
        {
          files: [],
          currentFolderId: folderId,
          currentFolderName: "My Drive",
          isMockData: false,
          accountIndex,
          accounts: [],
          isAuthenticated: false,
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
    }

    // Authoritatively resolve valid access token specifically for the requested account index
    const accessToken = await getValidAccessTokenForAccount(accountIndex);

    // If single item lookup requested
    if (itemId) {
      const item = await getDriveItemById(
        itemId,
        accessToken ?? undefined,
        accountIndex,
        forceRefresh
      );
      if (!item) {
        return NextResponse.json(
          { error: "File tidak ditemukan" },
          {
            status: 404,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            },
          }
        );
      }
      return NextResponse.json(
        { item, accountIndex },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      );
    }

    const query = searchParams.get("query") || searchParams.get("q") || "";

    // Otherwise list folder items
    const driveData = await getDriveFiles(
      accessToken ?? undefined,
      folderId,
      accountIndex,
      forceRefresh,
      query
    );

    // If manual refresh requested, trigger incremental sync in the background
    if (forceRefresh) {
      syncDriveChangesForAccount(accountIndex).catch(() => {});
    }

    if (folderId !== "root" && !query) {
      try {
        const breadcrumbs = await getFolderBreadcrumbs(
          folderId,
          accessToken ?? undefined,
          accountIndex
        );
        driveData.breadcrumbs = breadcrumbs;
      } catch (_) {}
    }

    const cacheHeader = forceRefresh
      ? "no-store, no-cache, must-revalidate"
      : "private, max-age=10, stale-while-revalidate=60";

    return NextResponse.json(driveData, {
      headers: {
        "Cache-Control": cacheHeader,
      },
    });
  } catch (error: any) {
    console.error("API /api/drive error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Drive items" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}
