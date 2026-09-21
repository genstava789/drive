import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import fs from "fs";
import path from "path";

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
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "default-white-smoke-google-drive-explorer-secret-key-12345",
});
