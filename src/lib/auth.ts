import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import fs from "fs";
import path from "path";
import { GoogleAccount } from "@/types/drive";
import { getGoogleCredentials } from "@/lib/auth-credentials";
import {
  saveServerAccount,
  refreshGoogleAccessToken,
  getServerStoreState,
  getServerAccounts,
} from "@/lib/server-account-store";
import { clearServerDriveCache } from "@/lib/google-drive";

// Konfigurasi dinamis AUTH_URL dan NEXTAUTH_URL untuk pengujian localhost & deployment Vercel
const isVercel = Boolean(
  process.env.VERCEL === "1" ||
  process.env.VERCEL_ENV ||
  process.env.VERCEL_URL
);

// Dapatkan domain redirect terdaftar resmi dari credentials.json
let registeredBaseDomain = "https://drive-iota-vert.vercel.app";
try {
  const credPath = path.join(process.cwd(), "credentials.json");
  if (fs.existsSync(credPath)) {
    const fileContent = fs.readFileSync(credPath, "utf-8");
    const parsed = JSON.parse(fileContent);
    const creds = parsed.web || parsed.installed;
    if (creds?.redirect_uris && creds.redirect_uris.length > 0) {
      const match = creds.redirect_uris[0].split("/api/auth")[0];
      if (match) {
        registeredBaseDomain = match.replace(/\/$/, "");
      }
    }
  }
} catch {
  // Gunakan fallback resmi jika file tidak terbaca
}

if (isVercel) {
  // Di platform Vercel, prioritaskan AUTH_URL / NEXTAUTH_URL resmi (bukan localhost) atau domain dari credentials.json
  const prodUrl =
    (process.env.AUTH_URL && !process.env.AUTH_URL.includes("localhost"))
      ? process.env.AUTH_URL
      : (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost"))
      ? process.env.NEXTAUTH_URL
      : registeredBaseDomain;

  process.env.AUTH_URL = prodUrl.split("/api/auth")[0].replace(/\/$/, "");
  process.env.NEXTAUTH_URL = process.env.AUTH_URL;
} else if (process.env.NODE_ENV === "development" || !process.env.AUTH_URL) {
  // Saat pengujian lokal (development / localhost)
  process.env.AUTH_URL = "http://localhost:3000";
  process.env.NEXTAUTH_URL = "http://localhost:3000";
} else {
  // Pengujian lokal mandiri lainnya
  process.env.AUTH_URL = process.env.AUTH_URL.split("/api/auth")[0].replace(/\/$/, "");
  process.env.NEXTAUTH_URL = process.env.AUTH_URL;
}

export { getGoogleCredentials };

const googleCreds = getGoogleCredentials();

// Pastikan process.env juga tersinkronisasi bersih untuk internal Auth.js
process.env.GOOGLE_CLIENT_ID = googleCreds.clientId;
process.env.AUTH_GOOGLE_ID = googleCreds.clientId;
process.env.GOOGLE_CLIENT_SECRET = googleCreds.clientSecret;
process.env.AUTH_GOOGLE_SECRET = googleCreds.clientSecret;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  redirectProxyUrl: isVercel
    ? `${(process.env.AUTH_URL || registeredBaseDomain).replace(/\/$/, "")}/api/auth`
    : undefined,
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "levidrive-production-secure-auth-secret-key-2026-xyz",
  providers: [
    Google({
      clientId: googleCreds.clientId,
      clientSecret: googleCreds.clientSecret,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.readonly",
          access_type: "offline",
          prompt: "consent",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // 1. Initial sign-in or additional account sign-in with Google
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.signedInAt = Date.now();

        const email =
          profile?.email || user?.email || (account as any).email || "";
        const name = profile?.name || user?.name || "Akun Google";
        const image = (profile as any)?.picture || user?.image || "";
        const accountId =
          (profile as any)?.sub || account.providerAccountId || email;

        // Persist to server-side store for cross-device persistence
        try {
          await saveServerAccount({
            id: accountId,
            name,
            email,
            image,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
          });
          // Invalidate server drive file cache when accounts change
          clearServerDriveCache();
        } catch (err) {
          console.warn("[Auth] Failed to save account to server store:", err);
        }

        // Synchronize token.accounts with the authoritative server accounts list
        try {
          const serverAccs = await getServerAccounts();
          if (serverAccs && serverAccs.length > 0) {
            token.accounts = serverAccs.map((a, idx) => ({
              id: a.id || `account-${idx}`,
              name: a.name || "Akun Google",
              email: a.email || "",
              image: a.image,
            }));
          }
        } catch (_) {}

        return token;
      }

      // 2. Validate existing token against central server-side store state
      const serverState = await getServerStoreState();
      // If server is in logged-out state, or no accounts remain in server store:
      if (serverState.loggedOut || !serverState.accounts || serverState.accounts.length === 0) {
        return null;
      }

      // If this token was created before the most recent server logout:
      if (
        serverState.loggedOutAt &&
        token.signedInAt &&
        (token.signedInAt as number) < serverState.loggedOutAt
      ) {
        return null;
      }

      // Keep token.accounts synchronized with the authoritative server accounts
      if (!token.accounts || (token.accounts as GoogleAccount[]).length === 0) {
        token.accounts = serverState.accounts.map((a, idx) => ({
          id: a.id || `account-${idx}`,
          name: a.name || "Akun Google",
          email: a.email || "",
          image: a.image,
        }));
      }

      // 3. Subsequent requests: check if access token expired or will expire in next 5 minutes
      const nowEpoch = Math.floor(Date.now() / 1000);
      const isExpired =
        typeof token.expiresAt === "number" &&
        token.expiresAt < nowEpoch + 300;

      if (isExpired && token.refreshToken) {
        try {
          const refreshed = await refreshGoogleAccessToken(
            token.refreshToken as string
          );
          const newExpiresAt = nowEpoch + refreshed.expiresIn;
          token.accessToken = refreshed.accessToken;
          token.expiresAt = newExpiresAt;

          // Update server store with refreshed access token for this specific account
          const targetEmail = (token.email as string) || "";
          if (targetEmail && targetEmail.includes("@")) {
            saveServerAccount({
              id: (token.sub as string) || targetEmail,
              email: targetEmail,
              accessToken: refreshed.accessToken,
              expiresAt: newExpiresAt,
            }).catch(() => {});
          }
        } catch (refreshErr) {
          console.error(
            "[Auth] Failed to refresh Google access token in JWT callback:",
            refreshErr
          );
        }
      }

      return token;
    },
    async session({ session, token }) {
      const serverState = await getServerStoreState();
      const validAccounts = (serverState.accounts || []).filter(
        (a) => a && a.email && a.email.includes("@")
      );
      const accountsList =
        validAccounts.length > 0
          ? validAccounts.map((a, idx) => ({
              id: a.id || `account-${idx}`,
              name: a.name || "Akun Google",
              email: a.email || "",
              image: a.image,
            }))
          : ((token?.accounts as GoogleAccount[]) || []).filter(
              (a) => a && a.email && a.email.includes("@")
            );

      if (!token || (!token.accessToken && accountsList.length === 0)) {
        return {
          ...session,
          user: undefined,
          accounts: [],
          accessToken: undefined,
        } as any;
      }

      if (token?.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      session.accounts = accountsList;

      // Keep user aligned with the primary account (index 0) if available
      if (accountsList.length > 0) {
        session.user = {
          ...(session.user || {}),
          id: accountsList[0].id,
          name: accountsList[0].name,
          email: accountsList[0].email,
          image: accountsList[0].image,
        } as any;
      }

      return session;
    },
  },
});
