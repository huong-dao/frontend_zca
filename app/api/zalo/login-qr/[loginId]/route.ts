import { NextResponse } from "next/server";
import { getQrLoginStatus } from "@/lib/zalo/server";
import { applyZaloSessionCookiesToNextResponse } from "@/lib/zalo/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ loginId: string }> },
) {
  const { loginId } = await context.params;
  const login = getQrLoginStatus(loginId);

  if (!login) {
    return NextResponse.json({ message: "Khong tim thay phien dang nhap QR." }, { status: 404 });
  }

  const response = NextResponse.json(login);

  if (login.sessionId) {
    await applyZaloSessionCookiesToNextResponse(response, login.sessionId);
  }

  return response;
}
