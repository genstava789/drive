import { NextRequest, NextResponse } from "next/server";
import {
  verifySitePassword,
  createSiteToken,
  SITE_SESSION_COOKIE_NAME,
} from "@/lib/site-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password wajib diisi." },
        { status: 400 }
      );
    }

    const result = await verifySitePassword(password);
    if (!result.valid || !result.role) {
      return NextResponse.json(
        {
          success: false,
          error: "Password salah. Silakan periksa kembali atau hubungi owner.",
        },
        { status: 401 }
      );
    }

    const token = await createSiteToken(result.role);
    const response = NextResponse.json({
      success: true,
      role: result.role,
      message:
        result.role === "admin"
          ? "Login berhasil sebagai Owner."
          : "Login berhasil sebagai Pengguna.",
    });

    // Set HttpOnly session cookie
    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set({
      name: SITE_SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error("[SiteGateLogin] Error processing login:", err);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal saat verifikasi." },
      { status: 500 }
    );
  }
}
