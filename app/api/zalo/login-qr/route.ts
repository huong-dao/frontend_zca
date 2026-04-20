import { cookies } from "next/headers";
import { startQrLogin } from "@/lib/zalo/server";
import { addSessionToSessionsCookie } from "@/lib/zalo/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const login = await startQrLogin();

  if (login.sessionId) {
    addSessionToSessionsCookie(cookieStore, login.sessionId);
  }

  return Response.json(login);
}
