import { NextResponse } from "next/server";
import { getSitePasswordsConfig } from "@/lib/site-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/gate/config
 * Public endpoint to fetch non-sensitive gate configuration such as social Telegram link
 */
export async function GET() {
  try {
    const config = await getSitePasswordsConfig();
    return NextResponse.json({
      success: true,
      telegramLink: config.telegramLink || "https://t.me/synerize",
    });
  } catch (err: any) {
    console.error("[GateConfig] GET error:", err);
    return NextResponse.json({
      success: true,
      telegramLink: "https://t.me/synerize",
    });
  }
}
