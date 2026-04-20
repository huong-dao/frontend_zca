import {
  getPublicSession,
  getQrByUserId,
} from "@/lib/zalo/server";
import { getZaloSessionIdFromApiInput } from "@/lib/zalo/request-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string | string[]; sessionId?: string };
    const sessionId = await getZaloSessionIdFromApiInput(body.sessionId, request.headers.get("x-zalo-session-id"));
    const session = await getPublicSession(sessionId);

    if (!session) {
      return Response.json({ message: "Chưa có phiên đăng nhập Zalo." }, { status: 401 });
    }

    const qrCodes = await getQrByUserId(body.userId, sessionId);

    return Response.json({ qrCodes });
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Không thể lấy mã QR theo user id.",
      },
      { status: 500 },
    );
  }
}
