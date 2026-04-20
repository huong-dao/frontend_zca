import { backendGetQrByUserId } from "@/lib/api/zalo-actions";
import { getZaloSessionIdFromApiInput } from "@/lib/zalo/request-session";
import { getPublicSession } from "@/lib/zalo/public-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string | string[]; sessionId?: string };
    const sessionId = await getZaloSessionIdFromApiInput(request, body.sessionId, request.headers.get("x-zalo-session-id"));
    const session = await getPublicSession(sessionId);

    if (!session) {
      return Response.json({ message: "Chưa có phiên đăng nhập Zalo." }, { status: 401 });
    }

    if (body.userId === undefined) {
      return Response.json({ message: "userId là bắt buộc để lấy mã QR." }, { status: 400 });
    }

    const { qrCodes } = await backendGetQrByUserId(session.id, body.userId);

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
