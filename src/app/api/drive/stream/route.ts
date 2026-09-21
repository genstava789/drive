import { NextRequest, NextResponse } from "next/server";
import { getValidAccessTokenForAccount } from "@/lib/server-account-store";

export const dynamic = "force-dynamic";

/**
 * Handle HEAD requests for video metadata and range capability negotiation
 */
export async function HEAD(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileId = searchParams.get("id");
  const accountIndex = parseInt(searchParams.get("accountIndex") || "0", 10);

  if (!fileId) {
    return new Response(null, { status: 400 });
  }

  try {
    const accessToken = await getValidAccessTokenForAccount(accountIndex);
    if (!accessToken) {
      return new Response(null, { status: 401 });
    }

    // Fetch file metadata from Google Drive API
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId
      )}?fields=id,name,size,mimeType&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!metaRes.ok) {
      return new Response(null, { status: metaRes.status });
    }

    const metadata = await metaRes.json();
    const headers = new Headers();
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Type", metadata.mimeType || "video/mp4");
    if (metadata.size) {
      headers.set("Content-Length", String(metadata.size));
    }
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Headers", "Range, Authorization");
    headers.set(
      "Access-Control-Expose-Headers",
      "Content-Range, Content-Length, Accept-Ranges"
    );
    headers.set("Cache-Control", "private, max-age=3600");

    return new Response(null, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("[Stream API HEAD] Error checking video metadata:", err);
    return new Response(null, { status: 500 });
  }
}

/**
 * Handle GET requests with streaming byte-range support (HTTP 206 Partial Content)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileId = searchParams.get("id");
  const accountIndex = parseInt(searchParams.get("accountIndex") || "0", 10);

  if (!fileId) {
    return NextResponse.json(
      { error: "ID berkas diperlukan" },
      { status: 400 }
    );
  }

  try {
    const accessToken = await getValidAccessTokenForAccount(accountIndex);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Akses token tidak tersedia untuk akun ini" },
        { status: 401 }
      );
    }

    // Construct upstream Google Drive request with forwarded Range header
    const driveHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      driveHeaders["Range"] = rangeHeader;
    }

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      fileId
    )}?alt=media&supportsAllDrives=true`;

    const googleRes = await fetch(driveUrl, {
      headers: driveHeaders,
    });

    if (!googleRes.ok && googleRes.status !== 206) {
      const errorText = await googleRes.text().catch(() => "");
      console.warn(
        `[Stream API] Google Drive API returned ${googleRes.status}:`,
        errorText.slice(0, 200)
      );
      return new Response(errorText, {
        status: googleRes.status,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Prepare streaming response headers
    const responseHeaders = new Headers();
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Headers", "Range, Authorization");
    responseHeaders.set(
      "Access-Control-Expose-Headers",
      "Content-Range, Content-Length, Accept-Ranges"
    );

    // Forward crucial video streaming headers
    const contentType =
      googleRes.headers.get("content-type") || "video/mp4";
    responseHeaders.set("Content-Type", contentType);

    const contentRange = googleRes.headers.get("content-range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    const contentLength = googleRes.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    responseHeaders.set("Cache-Control", "private, max-age=3600");

    return new Response(googleRes.body, {
      status: googleRes.status,
      statusText: googleRes.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[Stream API] Streaming error:", err);
    return NextResponse.json(
      { error: "Gagal mengalirkan berkas video" },
      { status: 500 }
    );
  }
}
