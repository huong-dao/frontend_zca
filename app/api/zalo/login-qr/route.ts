import { NextResponse } from "next/server";
import { startQrLogin } from "@/lib/zalo/server";
import { applyZaloSessionCookiesToNextResponse } from "@/lib/zalo/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const login = await startQrLogin();
  const response = NextResponse.json(login);

  if (login.sessionId) {
    await applyZaloSessionCookiesToNextResponse(response, login.sessionId);
  }

  return response;
}
