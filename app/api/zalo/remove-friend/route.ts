import { cookies } from "next/headers";
import {
  getPublicSession,
  removeFriend,
  ZALO_SESSION_COOKIE_NAME,
} from "@/lib/zalo/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { friendId?: string };
    const friendId = body.friendId?.trim();
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(ZALO_SESSION_COOKIE_NAME)?.value;
    const session = getPublicSession(sessionId);

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
