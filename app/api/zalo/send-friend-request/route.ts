import { cookies } from "next/headers";
import {
  getPublicSession,
  sendFriendRequest,
  ZALO_SESSION_COOKIE_NAME,
} from "@/lib/zalo/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string; message?: string };
    const userId = body.userId?.trim();
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(ZALO_SESSION_COOKIE_NAME)?.value;
    const session = getPublicSession(sessionId);

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
