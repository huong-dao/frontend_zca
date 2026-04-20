import {
  getPublicSession,
  removeFriend,
} from "@/lib/zalo/server";
import { getZaloSessionIdFromApiInput } from "@/lib/zalo/request-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { friendId?: string; sessionId?: string };
    const friendId = body.friendId?.trim();
    const sessionId = await getZaloSessionIdFromApiInput(body.sessionId, request.headers.get("x-zalo-session-id"));
    const session = await getPublicSession(sessionId);

    if (!session) {
      return Response.json({ message: "Chưa có phiên đăng nhập Zalo." }, { status: 401 });
    }

    if (!friendId) {
      return Response.json({ message: "friendId là bắt buộc." }, { status: 400 });
    }

    await removeFriend(friendId, sessionId);

    return Response.json({ result: "" as const });
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Không thể hủy kết bạn trên Zalo.",
      },
      { status: 500 },
    );
  }
}
