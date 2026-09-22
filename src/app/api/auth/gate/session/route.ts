import { NextRequest, NextResponse } from "next/server";
import {
  verifySiteToken,
  SITE_SESSION_COOKIE_NAME,
} from "@/lib/site-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SITE_SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({
      isAuthenticated: false,
      role: null,
    });
  }

  const session = await verifySiteToken(token);
  if (!session) {
    return NextResponse.json({
      isAuthenticated: false,
      role: null,
    });
  }

  return NextResponse.json({
    isAuthenticated: true,
    role: session.role,
    expiresAt: session.exp,
  });
}
