import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDriveFiles } from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get("folderId") || "root";
    const forceMock = searchParams.get("demo") === "true";

    const session = await auth();
    const accessToken = session?.accessToken;

    const driveData = await getDriveFiles(accessToken, folderId, forceMock);

    return NextResponse.json(driveData);
  } catch (error: any) {
    console.error("API /api/drive error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Drive items" },
      { status: 500 }
    );
  }
}
