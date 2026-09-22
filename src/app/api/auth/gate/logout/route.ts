import { NextRequest, NextResponse } from "next/server";
import { SITE_SESSION_COOKIE_NAME } from "@/lib/site-auth";

export const dynamic = "force-dynamic";

function handleLogout(req: NextRequest) {
  const isGet = req.method === "GET";
  const redirectUrl = new URL("/login", req.url);

  const response = isGet
    ? NextResponse.redirect(redirectUrl)
    : NextResponse.json({ success: true, message: "Berhasil logout dari sesi akses." });

  // Clear session cookie
  response.cookies.set({
    name: SITE_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function POST(req: NextRequest) {
  return handleLogout(req);
}

export async function GET(req: NextRequest) {
  return handleLogout(req);
}
