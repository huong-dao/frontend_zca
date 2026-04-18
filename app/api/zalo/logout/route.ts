import { cookies } from "next/headers";
import { clearZaloSessions, ZALO_SESSION_COOKIE_NAME } from "@/lib/zalo/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  clearZaloSessions();
  cookieStore.delete(ZALO_SESSION_COOKIE_NAME);

  return Response.json({ success: true });
}
