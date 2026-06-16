import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyZaloSessionOnBackend } from "@/lib/api/zalo-sessions";
import {
  mergeCookieAndClientHeaderPayload,
  writeZaloSessionsCookie,
  ZALO_SESSION_COOKIE_NAME,
  ZALO_SESSIONS_COOKIE_NAME,
  getZaloSessionCookieOptions,
} from "@/lib/zalo/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { sessionId?: string } = {};

  try {
    body = (await request.json()) as { sessionId?: string };
  } catch {
    body = {};
  }

  const sessionId = body.sessionId?.trim();

  if (!sessionId) {
    return NextResponse.json({ message: "sessionId là bắt buộc." }, { status: 400 });
  }

  const result = await verifyZaloSessionOnBackend(sessionId);
  const response = NextResponse.json(result);

  if (!result.sessionDeleted) {
    return response;
  }

  const cookieStore = await cookies();
  const merged = mergeCookieAndClientHeaderPayload(cookieStore, request);
  const ids = merged.ids.filter((id) => id !== sessionId);
  let active = merged.active === sessionId ? ids[0] ?? null : merged.active;

  if (active && !ids.includes(active)) {
    active = ids[0] ?? null;
  }

  writeZaloSessionsCookie(cookieStore, { ids, active });

  const opts = getZaloSessionCookieOptions();

  if (ids.length === 0) {
    response.cookies.delete(ZALO_SESSIONS_COOKIE_NAME);
    response.cookies.delete(ZALO_SESSION_COOKIE_NAME);
  } else {
    response.cookies.set(ZALO_SESSIONS_COOKIE_NAME, JSON.stringify({ ids, active }), opts);

    if (active) {
      response.cookies.set(ZALO_SESSION_COOKIE_NAME, active, opts);
    }
  }

  return response;
}
