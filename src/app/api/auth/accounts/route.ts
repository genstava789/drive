import { NextRequest, NextResponse } from "next/server";
import {
  getServerAccounts,
  removeServerAccount,
  getValidAccessTokenForAccount,
} from "@/lib/server-account-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/accounts
 * Returns client-safe list of accounts stored server-side
 */
export async function GET() {
  try {
    const serverAccounts = await getServerAccounts();

    // Map to client-safe representation without exposing sensitive tokens
    const clientSafeAccounts = serverAccounts.map((acc, index) => ({
      id: acc.id || `account-${index}`,
      name: acc.name || "Akun Google",
      email: acc.email || "",
      image: acc.image || undefined,
      hasValidToken: Boolean(acc.refreshToken || acc.accessToken),
      isPrimaryEnv: Boolean(acc.isPrimaryEnv),
    }));

    return NextResponse.json({
      accounts: clientSafeAccounts,
      total: clientSafeAccounts.length,
    });
  } catch (err: any) {
    console.error("GET /api/auth/accounts error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve server accounts" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/accounts?id=ACCOUNT_ID
 * Removes an account from server-side store
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    await removeServerAccount(id);
    return NextResponse.json({ success: true, removedId: id });
  } catch (err: any) {
    console.error("DELETE /api/auth/accounts error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to remove server account" },
      { status: 500 }
    );
  }
}
