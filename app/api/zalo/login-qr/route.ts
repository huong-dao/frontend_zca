import { cookies } from "next/headers";
import { startQrLogin, ZALO_SESSION_COOKIE_NAME } from "@/lib/zalo/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const currentSessionId = cookieStore.get(ZALO_SESSION_COOKIE_NAME)?.value;
  const login = await startQrLogin(currentSessionId);

  if (login.sessionId) {
    cookieStore.set(ZALO_SESSION_COOKIE_NAME, login.sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return Response.json(login);
}
