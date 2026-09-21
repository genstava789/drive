import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import fs from "fs";
import path from "path";
import { GoogleAccount } from "@/types/drive";

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

function cleanCredential(val: unknown): string {
  if (!val) return "";
  let s = String(val).trim();
  // Hapus awalan KEY= jika pengguna tidak sengaja menempel seluruh KEY=VALUE ke dalam field Vercel
  if (s.includes("=")) {
    const parts = s.split("=");
    if (
      parts.length === 2 &&
      (parts[0].includes("CLIENT") ||
        parts[0].includes("SECRET") ||
        parts[0].includes("ID") ||
        parts[0].includes("AUTH"))
    ) {
      s = parts[1].trim();
    }
  }
  // Hapus tanda kutip ganda, kutip tunggal, backtick, dan spasi di awal/akhir
  s = s.replace(/^[`"'\s]+|[`"'\s]+$/g, "");
  // Abaikan jika nilai masih berupa placeholder contoh
  if (
    s.includes("your-google") ||
    s.includes("example") ||
    s === "undefined" ||
    s === "null"
  ) {
    return "";
  }
  return s;
}

import { getGoogleCredentials } from "./auth-credentials";
import {
  saveServerAccount,
  refreshGoogleAccessToken,
} from "./server-account-store";

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
      // 1. Initial sign-in with Google
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;

        // Support multi-account storage in JWT token
        const accountsList: GoogleAccount[] = Array.isArray(token.accounts)
          ? [...(token.accounts as GoogleAccount[])]
          : [];

        const email =
          profile?.email || user?.email || (account as any).email || "";
        const name = profile?.name || user?.name || "Akun Google";
        const image = (profile as any)?.picture || user?.image || "";
        const accountId =
          (profile as any)?.sub || account.providerAccountId || email;

        const existingIndex = accountsList.findIndex(
          (a: GoogleAccount) => a.email === email || a.id === accountId
        );

        const accountData: GoogleAccount = {
          id: accountId,
          name,
          email,
          image,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };

        if (existingIndex >= 0) {
          accountsList[existingIndex] = accountData;
        } else {
          accountsList.push(accountData);
        }

        token.accounts = accountsList;

        // Persist to server-side store for cross-device persistence
        saveServerAccount({
          id: accountId,
          name,
          email,
          image,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        }).catch((err) => {
          console.warn("[Auth] Failed to save account to server store:", err);
        });

        return token;
      }

      // 2. Subsequent requests: check if access token expired or will expire in next 5 minutes
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

          if (Array.isArray(token.accounts) && token.accounts.length > 0) {
            (token.accounts[0] as GoogleAccount).accessToken =
              refreshed.accessToken;
            (token.accounts[0] as GoogleAccount).expiresAt = newExpiresAt;
          }

          // Update server store with refreshed access token
          if (token.sub) {
            saveServerAccount({
              id: token.sub,
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
      if (token?.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      if (token?.accounts) {
        session.accounts = token.accounts as GoogleAccount[];
      }
      return session;
    },
  },
});
