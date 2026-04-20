import { backendGetGroupInfo } from "@/lib/api/zalo-actions";
import { getZaloSessionIdFromApiInput } from "@/lib/zalo/request-session";
import { getPublicSession } from "@/lib/zalo/public-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { groupId?: string; sessionId?: string };
    const sessionId = await getZaloSessionIdFromApiInput(request, body.sessionId, request.headers.get("x-zalo-session-id"));
    const session = await getPublicSession(sessionId);

    if (!session) {
      return Response.json({ message: "Chưa có phiên đăng nhập Zalo." }, { status: 401 });
    }

    if (!body.groupId) {
      return Response.json({ message: "ID nhóm Zalo là bắt buộc." }, { status: 400 });
    }

    const { groupInfo } = await backendGetGroupInfo(session.id, body.groupId);

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
