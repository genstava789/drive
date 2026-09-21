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
