import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import fs from "fs";
import path from "path";
import { GoogleAccount } from "@/types/drive";

/**
 * Membaca kredensial Google OAuth dari credentials.json di root project,
 * dengan fallback ke environment variables (process.env.GOOGLE_CLIENT_ID).
 */
function getGoogleCredentials() {
  try {
    const credPath = path.join(process.cwd(), "credentials.json");
    if (fs.existsSync(credPath)) {
      const fileContent = fs.readFileSync(credPath, "utf-8");
      const parsed = JSON.parse(fileContent);
      const creds = parsed.installed || parsed.web;

      if (creds?.client_id && creds?.client_secret) {
        return {
          clientId: creds.client_id as string,
          clientSecret: creds.client_secret as string,
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
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    source: "process.env",
  };
}

const googleCreds = getGoogleCredentials();

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
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
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "default-white-smoke-google-drive-explorer-secret-key-12345",
});
