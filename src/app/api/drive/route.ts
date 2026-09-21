import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDriveFiles, getDriveItemById } from "@/lib/google-drive";
import { getServerStoreState } from "@/lib/server-account-store";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get("id");
    const folderId = searchParams.get("folderId") || "root";
    const accountIndexParam = searchParams.get("accountIndex") || "0";
    const accountIndex = parseInt(accountIndexParam, 10) || 0;
    const forceMock = searchParams.get("demo") === "true";

    // 1. Authoritative check: if server store is in logged-out state or empty, reject immediately
    const serverState = await getServerStoreState();
    if (serverState.loggedOut || !serverState.accounts || serverState.accounts.length === 0) {
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

    const session = await auth();

    // Select access token for the requested account index
    let accessToken = session?.accessToken;
    if (session?.accounts && session.accounts[accountIndex]?.accessToken) {
      accessToken = session.accounts[accountIndex].accessToken;
    }

    // If single item lookup requested
    if (itemId) {
      const item = await getDriveItemById(itemId, accessToken, accountIndex);
      if (!item) {
        return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({ item, accountIndex });
    }

    // Otherwise list folder items
    const driveData = await getDriveFiles(
      accessToken,
      folderId,
      accountIndex,
      forceMock
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
