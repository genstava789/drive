import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ServerAccount, ServerStoreState } from "./server-account-store";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://kbcyqbejeexitkvbwogo.supabase.co";

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    "sb_publishable_L40Y-cnaNgNiTsDG8jq2VQ_51LDHNyo";

  if (!url || !key) return null;

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.warn("[Supabase] Failed to initialize Supabase client:", err);
    return null;
  }
}

/**
 * Fetch accounts and session control state from Supabase
 */
export async function fetchStateFromSupabase(): Promise<ServerStoreState | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    // 1. Fetch global session control
    const { data: sessionData, error: sessionError } = await supabase
      .from("drive_session_control")
      .select("logged_out, logged_out_at")
      .eq("id", "global_session")
      .maybeSingle();

    if (sessionError) {
      // Table might not exist yet in Supabase schema
      return null;
    }

    const isLoggedOut = Boolean(sessionData?.logged_out);
    const loggedOutAt = Number(sessionData?.logged_out_at) || 0;

    if (isLoggedOut) {
      return {
        loggedOut: true,
        loggedOutAt,
        accounts: [],
      };
    }

    // 2. Fetch active accounts
    const { data: accountsData, error: accountsError } = await supabase
      .from("drive_accounts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (accountsError) {
      return null;
    }

    const accounts: ServerAccount[] = (accountsData || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image || undefined,
      accessToken: row.access_token || undefined,
      refreshToken: row.refresh_token || undefined,
      expiresAt: row.expires_at ? Number(row.expires_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    }));

    return {
      loggedOut: false,
      loggedOutAt: 0,
      accounts,
    };
  } catch (err) {
    console.warn("[Supabase] Error fetching state from Supabase:", err);
    return null;
  }
}

/**
 * Save store state to Supabase
 */
export async function saveStateToSupabase(state: ServerStoreState): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    // 1. Update session control
    await supabase.from("drive_session_control").upsert(
      {
        id: "global_session",
        logged_out: Boolean(state.loggedOut),
        logged_out_at: Number(state.loggedOutAt) || 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // 2. If logged out, mark all accounts inactive
    if (state.loggedOut) {
      await supabase
        .from("drive_accounts")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("is_active", true);
      return true;
    }

    // 3. Upsert active accounts
    if (state.accounts && state.accounts.length > 0) {
      for (const acc of state.accounts) {
        await supabase.from("drive_accounts").upsert(
          {
            id: acc.id,
            name: acc.name,
            email: acc.email,
            image: acc.image || null,
            access_token: acc.accessToken || null,
            refresh_token: acc.refreshToken || null,
            expires_at: acc.expiresAt || null,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }
    }

    return true;
  } catch (err) {
    console.warn("[Supabase] Error saving state to Supabase:", err);
    return false;
  }
}

/**
 * Remove an account from Supabase
 */
export async function removeAccountFromSupabase(accountId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    await supabase
      .from("drive_accounts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .or(`id.eq.${accountId},email.eq.${accountId}`);
    return true;
  } catch (err) {
    console.warn("[Supabase] Error removing account from Supabase:", err);
    return false;
  }
}

/* =========================================================================
   METADATA CACHE & INDEXING LAYER (files_cache & drive_sync_state)
   ========================================================================= */

import { DriveFile } from "@/types/drive";

function mapRowToDriveFile(row: any): DriveFile {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mime_type,
    size: row.size !== null && row.size !== undefined ? Number(row.size) : undefined,
    modifiedTime: row.modified_time || new Date().toISOString(),
    createdTime: row.created_time || undefined,
    webViewLink: row.web_view_link || undefined,
    webContentLink:
      row.web_content_link ||
      `https://drive.google.com/uc?export=download&id=${row.id}`,
    iconLink: row.icon_link || undefined,
    thumbnailLink: row.thumbnail_link || undefined,
    shared: Boolean(row.shared),
    parents: Array.isArray(row.parents)
      ? row.parents
      : row.parent_id
      ? [row.parent_id]
      : undefined,
    description: row.description || undefined,
  };
}

function mapDriveFileToRow(
  f: DriveFile,
  accountId: string,
  defaultParentId = "root"
): any {
  const isFolder = f.mimeType === "application/vnd.google-apps.folder";
  const rawParent =
    f.parents && f.parents.length > 0 ? f.parents[0] : defaultParentId;
  const parentId =
    rawParent === "0AAgz7sm0L0i1Uk9PVA" || rawParent === "root"
      ? "root"
      : rawParent;
  const normalizedParents = (f.parents && f.parents.length > 0 ? f.parents : [parentId]).map(
    (p) => (p === "0AAgz7sm0L0i1Uk9PVA" ? "root" : p)
  );

  return {
    id: f.id,
    account_id: accountId,
    name: f.name,
    mime_type: f.mimeType,
    is_folder: isFolder,
    size: f.size !== undefined && f.size !== null ? Number(f.size) : null,
    parent_id: parentId,
    parents: normalizedParents,
    thumbnail_link: f.thumbnailLink || null,
    web_view_link: f.webViewLink || null,
    web_content_link: f.webContentLink || null,
    icon_link: f.iconLink || null,
    shared: Boolean(f.shared),
    trashed: false,
    created_time: f.createdTime || null,
    modified_time: f.modifiedTime || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch cached files for a specific folder from Supabase files_cache (Latency ~15-25ms)
 */
export async function getCachedFolderFilesFromSupabase(
  accountId: string,
  folderId = "root",
  query?: string
): Promise<DriveFile[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !accountId) return null;

  try {
    let builder = supabase
      .from("files_cache")
      .select("*")
      .eq("account_id", accountId)
      .eq("trashed", false);

    if (query && query.trim()) {
      // Fast ILIKE search
      builder = builder.ilike("name", `%${query.trim()}%`);
    } else if (folderId === "root" || folderId === "0AAgz7sm0L0i1Uk9PVA") {
      // Root items match both 'root' and Google Drive's root folder ID
      builder = builder.in("parent_id", ["root", "0AAgz7sm0L0i1Uk9PVA"]);
    } else {
      // Query specific parent folder
      builder = builder.eq("parent_id", folderId);
    }

    // Sort folders first, then alphabetical by name
    builder = builder
      .order("is_folder", { ascending: false })
      .order("name", { ascending: true });

    const { data, error } = await builder;

    if (error) {
      // If table doesn't exist yet, gracefully return null
      if (error.code === "PGRST205" || error.code === "42P01") {
        return null;
      }
      console.warn("[SupabaseCache] Error querying files_cache:", error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Ensure no root directory placeholder ("My Drive" folder) is returned as a child item
    const validRows = data.filter(
      (row: any) =>
        !(
          row.name?.toLowerCase() === "my drive" &&
          row.is_folder &&
          (row.parent_id === "root" || row.id === "0AAgz7sm0L0i1Uk9PVA")
        )
    );

    return validRows.map(mapRowToDriveFile);
  } catch (err) {
    console.warn("[SupabaseCache] Unexpected query error:", err);
    return null;
  }
}

/**
 * Fetch a single cached file/folder item by ID from Supabase
 */
export async function getCachedItemByIdFromSupabase(
  accountId: string,
  itemId: string
): Promise<DriveFile | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !accountId || !itemId) return null;

  try {
    const { data, error } = await supabase
      .from("files_cache")
      .select("*")
      .eq("account_id", accountId)
      .eq("id", itemId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapRowToDriveFile(data);
  } catch (_) {
    return null;
  }
}

/**
 * Batch upsert Drive files into Supabase files_cache
 */
export async function upsertFilesToSupabaseCache(
  accountId: string,
  files: DriveFile[],
  defaultParentId = "root"
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !accountId || !files || files.length === 0) return false;

  try {
    // Filter out the Drive root itself so it is never saved as a child item
    const validFiles = files.filter(
      (f) =>
        !(
          f.name?.toLowerCase() === "my drive" &&
          f.mimeType === "application/vnd.google-apps.folder"
        ) && f.id !== "0AAgz7sm0L0i1Uk9PVA"
    );

    if (validFiles.length === 0) return true;

    const rows = validFiles.map((f) =>
      mapDriveFileToRow(f, accountId, defaultParentId)
    );

    // Upsert in batches of 100 for maximum performance
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("files_cache").upsert(chunk, {
        onConflict: "id, account_id",
      });

      if (error) {
        if (error.code === "PGRST205" || error.code === "42P01") {
          // Table doesn't exist yet
          return false;
        }
        console.warn(
          "[SupabaseCache] Error upserting files_cache chunk:",
          error.message
        );
        return false;
      }
    }

    return true;
  } catch (err) {
    console.warn("[SupabaseCache] Upsert error:", err);
    return false;
  }
}

/**
 * Remove deleted files from Supabase files_cache
 */
export async function removeFilesFromSupabaseCache(
  accountId: string,
  fileIds: string[]
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !accountId || !fileIds || fileIds.length === 0) return false;

  try {
    const { error } = await supabase
      .from("files_cache")
      .delete()
      .eq("account_id", accountId)
      .in("id", fileIds);

    if (error) {
      console.warn("[SupabaseCache] Error deleting files:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[SupabaseCache] Delete error:", err);
    return false;
  }
}

/**
 * Retrieve Google Drive changes.list start_page_token for an account
 */
export async function getDriveSyncToken(
  accountId: string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !accountId) return null;

  try {
    const { data, error } = await supabase
      .from("drive_sync_state")
      .select("start_page_token")
      .eq("account_id", accountId)
      .maybeSingle();

    if (error || !data) return null;
    return data.start_page_token || null;
  } catch (_) {
    return null;
  }
}

/**
 * Save Google Drive changes.list start_page_token for an account
 */
export async function saveDriveSyncToken(
  accountId: string,
  token: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !accountId || !token) return false;

  try {
    const { error } = await supabase.from("drive_sync_state").upsert(
      {
        account_id: accountId,
        start_page_token: token,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "account_id" }
    );

    return !error;
  } catch (_) {
    return false;
  }
}
