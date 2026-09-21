import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDriveFiles, getDriveItemById } from "@/lib/google-drive";
import {
  getServerStoreState,
  getServerAccounts,
  getValidAccessTokenForAccount,
  getEnvProvisionedAccount,
} from "@/lib/server-account-store";

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

    const session = await auth();
    const serverState = await getServerStoreState();
    const serverAccounts = await getServerAccounts();
    const envAcc = getEnvProvisionedAccount();

    const hasSessionAuth = Boolean(session?.user || session?.accessToken);
    const hasServerAuth = Boolean(
      serverAccounts.length > 0 ||
      (serverState.accounts && serverState.accounts.length > 0) ||
      envAcc
    );

    // Only reject if completely unauthenticated across both browser session and server store
    if (!hasSessionAuth && !hasServerAuth && serverState.loggedOut) {
      return NextResponse.json({
        files: [],
        currentFolderId: folderId,
        currentFolderName: "My Drive",
        isMockData: false,
        accountIndex,
        accounts: [],
        isAuthenticated: false,
      });
    }

    // Select access token for the requested account index
    let accessToken: string | null | undefined = session?.accessToken;
    if (session?.accounts && session.accounts[accountIndex]?.accessToken) {
      accessToken = session.accounts[accountIndex].accessToken;
    }
    if (!accessToken) {
      accessToken = await getValidAccessTokenForAccount(accountIndex);
    }

    // If single item lookup requested
    if (itemId) {
      const item = await getDriveItemById(
        itemId,
        accessToken ?? undefined,
        accountIndex,
        forceRefresh
      );
      if (!item) {
        return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({ item, accountIndex });
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

    return NextResponse.json(driveData);
  } catch (error: any) {
    console.error("API /api/drive error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Drive items" },
      { status: 500 }
    );
  }
}
