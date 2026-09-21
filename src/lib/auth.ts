import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import fs from "fs";
import path from "path";
import { GoogleAccount } from "@/types/drive";

/**
 * Membaca kredensial Google OAuth:
 * Prioritas 1 (Vercel / Prod): Environment variable GOOGLE_CLIENT_ID / AUTH_GOOGLE_ID
 * Prioritas 2 (Local Dev): credentials.json di root project
 */
function getGoogleCredentials() {
  const envClientId = (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.AUTH_GOOGLE_ID ||
    ""
  )
    .trim()
    .replace(/^["']|["']$/g, "");

  const envClientSecret = (
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.AUTH_GOOGLE_SECRET ||
    ""
  )
    .trim()
    .replace(/^["']|["']$/g, "");

  if (envClientId && envClientSecret) {
    return {
      clientId: envClientId,
      clientSecret: envClientSecret,
      source: "process.env",
    };
  }

  try {
    const credPath = path.join(process.cwd(), "credentials.json");
    if (fs.existsSync(credPath)) {
      const fileContent = fs.readFileSync(credPath, "utf-8");
      const parsed = JSON.parse(fileContent);
      const creds = parsed.installed || parsed.web;

      if (creds?.client_id && creds?.client_secret) {
        return {
          clientId: String(creds.client_id).trim(),
          clientSecret: String(creds.client_secret).trim(),
          source: "credentials.json",
        };
      }
    }
  } catch (err) {
    console.warn(
      "[Auth] Gagal membaca credentials.json, beralih ke environment variable:",
      err
    );
  }

  return {
    clientId: envClientId,
    clientSecret: envClientSecret,
    source: "process.env",
  };
}

const googleCreds = getGoogleCredentials();

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
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
