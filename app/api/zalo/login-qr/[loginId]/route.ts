import { cookies } from "next/headers";
import { getQrLoginStatus, ZALO_SESSION_COOKIE_NAME } from "@/lib/zalo/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ loginId: string }> },
) {
  const { loginId } = await context.params;
  const login = getQrLoginStatus(loginId);

  if (!login) {
    return Response.json({ message: "Khong tim thay phien dang nhap QR." }, { status: 404 });
  }

  if (login.sessionId) {
    const cookieStore = await cookies();
    cookieStore.set(ZALO_SESSION_COOKIE_NAME, login.sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return Response.json(login);
}
