import { redirect } from "next/navigation";
import { getSiteSession } from "@/lib/site-auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const siteSession = await getSiteSession().catch(() => null);
  if (!siteSession || !siteSession.role) {
    redirect("/login");
  }
  redirect("/0");
}

