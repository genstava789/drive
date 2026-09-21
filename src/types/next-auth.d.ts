import { DefaultSession } from "next-auth";
import { GoogleAccount } from "./drive";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    accounts?: GoogleAccount[];
    activeAccountIndex?: number;
    error?: string;
    user: {
      id?: string;
    } & DefaultSession["user"];
  }

  interface Account {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    accounts?: GoogleAccount[];
    activeAccountIndex?: number;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
