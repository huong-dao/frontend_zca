import { cookies } from "next/headers";
import { getPublicSession, ZALO_SESSION_COOKIE_NAME } from "@/lib/zalo/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(ZALO_SESSION_COOKIE_NAME)?.value;
  const session = getPublicSession(sessionId);

  return Response.json({ session });
}
