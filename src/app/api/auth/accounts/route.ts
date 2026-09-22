import { NextRequest, NextResponse } from "next/server";
import {
  getServerAccounts,
  removeServerAccount,
  clearAllServerAccounts,
} from "@/lib/server-account-store";
import { getSiteSession } from "@/lib/site-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/accounts
 * Returns client-safe list of accounts stored server-side
 */
export async function GET() {
  try {
    const [serverAccounts, siteSession] = await Promise.all([
      getServerAccounts(),
      getSiteSession().catch(() => null),
    ]);

    const isAdmin = siteSession?.role === "admin";

    // Map to client-safe representation without exposing sensitive tokens, filtering dummy accounts
    const clientSafeAccounts = serverAccounts
      .filter((acc) => acc.email && acc.email.includes("@"))
      .map((acc, index) => ({
        id: acc.id || `account-${index}`,
        name: acc.name || "Akun Google",
        // Mask owner email for non-admin users for absolute privacy
        email: isAdmin ? acc.email || "" : "Akun Terverifikasi",
        image: acc.image || undefined,
        hasValidToken: Boolean(acc.refreshToken || acc.accessToken),
        isPrimaryEnv: Boolean(acc.isPrimaryEnv),
      }));

    return NextResponse.json(
      {
        accounts: clientSafeAccounts,
        total: clientSafeAccounts.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
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
    const siteSession = await getSiteSession();
    if (siteSession?.role !== "admin") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya owner yang berhak mengelola akun Google." },
        { status: 403 }
      );
    }

    const isAll = req.nextUrl.searchParams.get("all") === "true";
    const id = req.nextUrl.searchParams.get("id");
    if (isAll || !id) {
      await clearAllServerAccounts();
      const response = NextResponse.json({ success: true, clearedAll: true });
      // WIPE ALL SESSION COOKIES DIRECTLY IN HTTP HEADERS ACROSS ALL VARIANTS
      const cookieNames = [
        "authjs.session-token",
        "__Secure-authjs.session-token",
        "next-auth.session-token",
        "__Secure-next-auth.session-token",
        "authjs.csrf-token",
        "next-auth.csrf-token",
        "authjs.callback-url",
        "next-auth.callback-url",
      ];
      for (const name of cookieNames) {
        response.cookies.set(name, "", {
          path: "/",
          expires: new Date(0),
          maxAge: 0,
        });
      }
      return response;
    }

    await removeServerAccount(id);
    const accounts = await getServerAccounts();
    const response = NextResponse.json({ success: true, removedId: id, remaining: accounts.length });
    if (accounts.length === 0) {
      const cookieNames = [
        "authjs.session-token",
        "__Secure-authjs.session-token",
        "next-auth.session-token",
        "__Secure-next-auth.session-token",
      ];
      for (const name of cookieNames) {
        response.cookies.set(name, "", {
          path: "/",
          expires: new Date(0),
          maxAge: 0,
        });
      }
    }
    return response;
  } catch (err: any) {
    console.error("DELETE /api/auth/accounts error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to remove server account" },
      { status: 500 }
    );
  }
}
