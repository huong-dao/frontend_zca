import { cookies } from "next/headers";
import { getQrLoginStatus } from "@/lib/zalo/server";
import { addSessionToSessionsCookie } from "@/lib/zalo/session-cookie";

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
    addSessionToSessionsCookie(cookieStore, login.sessionId);
  }

  return Response.json(login);
}
