import { NextRequest, NextResponse } from "next/server";
import { getSiteSession } from "@/lib/site-auth";
import { getWorkerConfig, saveWorkerConfig, WorkerConfig } from "@/lib/worker-config";

export const dynamic = "force-dynamic";

/**
 * GET /api/drive/worker-config
 * Returns current Cloudflare Worker direct download configuration
 */
export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get("refresh") === "true";
    const config = await getWorkerConfig(force);
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (err: any) {
    console.error("GET /api/drive/worker-config error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load worker config" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/drive/worker-config
 * Updates Cloudflare Worker direct download configuration (Admin/Owner only)
 */
export async function POST(req: NextRequest) {
  try {
    const siteSession = await getSiteSession();
    if (!siteSession || siteSession.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Hanya Owner/Admin yang berhak mengubah konfigurasi Cloudflare Worker." },
        { status: 403 }
      );
    }

    const body = ((await req.json().catch(() => ({}))) || {}) as Partial<WorkerConfig>;
    const defaultWorkerUrl = typeof body.defaultWorkerUrl === "string" ? body.defaultWorkerUrl.trim() : "";
    const accountWorkers = typeof body.accountWorkers === "object" && body.accountWorkers !== null ? body.accountWorkers : {};
    const useWorkerStreaming = Boolean(body.useWorkerStreaming);

    // Validate URL format if provided
    if (defaultWorkerUrl && !defaultWorkerUrl.startsWith("http://") && !defaultWorkerUrl.startsWith("https://")) {
      return NextResponse.json(
        { success: false, error: "URL Worker harus diawali dengan https:// atau http://" },
        { status: 400 }
      );
    }

    // Clean accountWorkers dictionary
    const sanitizedAccountWorkers: Record<string, string> = {};
    for (const [key, val] of Object.entries(accountWorkers)) {
      if (typeof val === "string" && val.trim()) {
        const cleanVal = val.trim().replace(/\/+$/, "");
        if (cleanVal.startsWith("http://") || cleanVal.startsWith("https://")) {
          sanitizedAccountWorkers[key] = cleanVal;
        }
      }
    }

    const updated = await saveWorkerConfig({
      defaultWorkerUrl: defaultWorkerUrl.replace(/\/+$/, ""),
      accountWorkers: sanitizedAccountWorkers,
      useWorkerStreaming,
    });

    return NextResponse.json({
      success: true,
      message: "Konfigurasi Cloudflare Worker berhasil disimpan ke database secara real-time.",
      config: updated,
    });
  } catch (err: any) {
    console.error("POST /api/drive/worker-config error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menyimpan konfigurasi worker" },
      { status: 500 }
    );
  }
}
