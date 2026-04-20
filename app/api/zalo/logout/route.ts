import { cookies } from "next/headers";
import {
  clearAllZaloSessions,
  removeZaloSession,
  ZALO_SESSION_COOKIE_NAME,
  ZALO_SESSIONS_COOKIE_NAME,
} from "@/lib/zalo/server";
import { readZaloSessionsPayload, removeSessionFromSessionsCookie } from "@/lib/zalo/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieStore = await cookies();

  let body: { sessionId?: string } = {};

  try {
    body = (await request.json()) as { sessionId?: string };
  } catch {
    body = {};
  }

  const sessionId = body.sessionId?.trim();

  if (sessionId) {
    await removeZaloSession(sessionId);
    removeSessionFromSessionsCookie(cookieStore, sessionId);
  } else {
    await clearAllZaloSessions();
    cookieStore.delete(ZALO_SESSIONS_COOKIE_NAME);
    cookieStore.delete(ZALO_SESSION_COOKIE_NAME);
  }

  return Response.json({ success: true });
}
