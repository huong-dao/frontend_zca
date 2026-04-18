import { cookies } from "next/headers";
import {
  getGroupInfo,
  getPublicSession,
  ZALO_SESSION_COOKIE_NAME,
} from "@/lib/zalo/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(ZALO_SESSION_COOKIE_NAME)?.value;
    const session = getPublicSession(sessionId);
    const body = (await request.json()) as { groupId?: string };

    if (!session) {
      return Response.json({ message: "Chưa có phiên đăng nhập Zalo." }, { status: 401 });
    }

    if (!body.groupId) {
      return Response.json({ message: "ID nhóm Zalo là bắt buộc." }, { status: 400 });
    }

    const groupInfo = await getGroupInfo(body.groupId, sessionId);

    return Response.json({ groupInfo });
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Không thể lấy thông tin nhóm Zalo.",
      },
      { status: 500 },
    );
  }
}
