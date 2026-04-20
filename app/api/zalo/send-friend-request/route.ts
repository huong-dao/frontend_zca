import {
  getPublicSession,
  sendFriendRequest,
} from "@/lib/zalo/server";
import { getZaloSessionIdFromApiInput } from "@/lib/zalo/request-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string; message?: string; sessionId?: string };
    const userId = body.userId?.trim();
    const sessionId = await getZaloSessionIdFromApiInput(body.sessionId, request.headers.get("x-zalo-session-id"));
    const session = await getPublicSession(sessionId);

    if (!session) {
      return Response.json({ message: "Chưa có phiên đăng nhập Zalo." }, { status: 401 });
    }

    if (!userId) {
      return Response.json({ message: "userId là bắt buộc." }, { status: 400 });
    }

    const result = await sendFriendRequest(userId, body.message, sessionId);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Không thể gửi lời mời kết bạn Zalo.",
      },
      { status: 500 },
    );
  }
}
