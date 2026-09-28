import { NextRequest, NextResponse } from "next/server";
import {
  getSiteSession,
  getSitePasswordsConfig,
  updateSitePasswordsConfig,
} from "@/lib/site-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/gate/passwords
 * Allows Owner/Admin to view the current site passwords for admin and regular user
 */
export async function GET() {
  try {
    const session = await getSiteSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Owner/Admin yang berhak melihat password." },
        { status: 403 }
      );
    }

    const config = await getSitePasswordsConfig(true);

    return NextResponse.json({
      success: true,
      adminPassword: config.adminPassword,
      userPassword: config.userPassword,
      telegramLink: config.telegramLink || "https://t.me/synerize",
      updatedAt: config.updatedAt,
    });
  } catch (err: any) {
    console.error("[GatePasswords] GET error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil konfigurasi password." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/gate/passwords
 * Allows Owner/Admin to update site passwords and telegram link in real-time
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSiteSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Owner/Admin yang berhak mengubah password." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { adminPassword, userPassword, telegramLink } = body;

    const trimmedAdmin = typeof adminPassword === "string" ? adminPassword.trim() : "";
    const trimmedUser = typeof userPassword === "string" ? userPassword.trim() : "";
    const trimmedTelegram = typeof telegramLink === "string" ? telegramLink.trim() : undefined;

    if (!trimmedAdmin) {
      return NextResponse.json(
        { error: "Password Admin tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (trimmedAdmin.length < 4) {
      return NextResponse.json(
        { error: "Password Admin minimal 4 karakter." },
        { status: 400 }
      );
    }

    if (!trimmedUser) {
      return NextResponse.json(
        { error: "Password Pengguna Biasa tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (trimmedUser.length < 4) {
      return NextResponse.json(
        { error: "Password Pengguna Biasa minimal 4 karakter." },
        { status: 400 }
      );
    }

    const updated = await updateSitePasswordsConfig({
      adminPassword: trimmedAdmin,
      userPassword: trimmedUser,
      ...(trimmedTelegram !== undefined ? { telegramLink: trimmedTelegram } : {}),
    });

    return NextResponse.json({
      success: true,
      message: "Password dan konfigurasi berhasil diperbarui secara real-time.",
      adminPassword: updated.adminPassword,
      userPassword: updated.userPassword,
      telegramLink: updated.telegramLink,
      updatedAt: updated.updatedAt,
    });
  } catch (err: any) {
    console.error("[GatePasswords] POST error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal saat memperbarui password." },
      { status: 500 }
    );
  }
}
