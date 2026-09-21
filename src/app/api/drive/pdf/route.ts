import { NextRequest, NextResponse } from "next/server";
import { getValidAccessTokenForAccount } from "@/lib/server-account-store";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileId = searchParams.get("id");
  const accountIndex = parseInt(searchParams.get("accountIndex") || "0", 10);

  if (!fileId) {
    return NextResponse.json({ error: "File ID diperlukan" }, { status: 400 });
  }

  // Check if real Google Drive file and session token available
  const isRealDriveFile = !fileId.startsWith("file-") && !fileId.startsWith("folder-");

  if (isRealDriveFile) {
    try {
      const accessToken = await getValidAccessTokenForAccount(accountIndex);

      if (accessToken) {
        const googleRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (googleRes.ok) {
          const pdfBuffer = await googleRes.arrayBuffer();
          return new Response(pdfBuffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }
    } catch (err) {
      console.warn("Proxying Google Drive PDF error, fallback to sample:", err);
    }
  }

  // Fallback to local valid sample PDF
  try {
    const samplePath = path.join(process.cwd(), "public", "sample.pdf");
    if (fs.existsSync(samplePath)) {
      const buffer = fs.readFileSync(samplePath);
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  } catch (e) {
    console.error("Error reading sample PDF:", e);
  }

  return NextResponse.json({ error: "PDF tidak dapat ditemukan" }, { status: 404 });
}
