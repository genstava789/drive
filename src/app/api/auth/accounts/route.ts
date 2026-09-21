import { NextRequest, NextResponse } from "next/server";
import {
  getServerAccounts,
  removeServerAccount,
  clearAllServerAccounts,
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
 * DELETE /api/auth/accounts?id=ACCOUNT_ID or ?all=true
 * Removes an account or all accounts from server-side store
 */
export async function DELETE(req: NextRequest) {
  try {
    const isAll = req.nextUrl.searchParams.get("all") === "true";
    if (isAll) {
      await clearAllServerAccounts();
      return NextResponse.json({ success: true, clearedAll: true });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      await clearAllServerAccounts();
      return NextResponse.json({ success: true, clearedAll: true });
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
