import { backendGetAllGroups } from "@/lib/api/zalo-actions";
import { getZaloSessionIdFromGetRequest } from "@/lib/zalo/request-session";
import { getPublicSession } from "@/lib/zalo/public-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const sessionId = await getZaloSessionIdFromGetRequest(request);
    const session = await getPublicSession(sessionId);

    if (!session) {
      return Response.json({ message: "Chưa có phiên đăng nhập Zalo." }, { status: 401 });
    }

    const payload = await backendGetAllGroups(session.id);

    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Không thể lấy danh sách nhóm Zalo.",
      },
      { status: 500 },
    );
  }
}
