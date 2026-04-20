import { cookies } from "next/headers";
import { fetchZaloSessionsList } from "@/lib/api/zalo-sessions";
import { mergeCookieAndClientHeaderPayload, writeZaloSessionsCookie } from "@/lib/zalo/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();

    if (!sessionId) {
      return Response.json({ message: "sessionId là bắt buộc." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const payload = mergeCookieAndClientHeaderPayload(cookieStore, request);
    const { sessions } = await fetchZaloSessionsList();
    const exists = sessions.some((s) => s.id === sessionId);

    if (!payload.ids.includes(sessionId) || !exists) {
      return Response.json({ message: "Phiên Zalo không tồn tại trong phiên làm việc hiện tại." }, { status: 400 });
    }

    writeZaloSessionsCookie(cookieStore, { ids: payload.ids, active: sessionId });

    return Response.json({ success: true as const, activeSessionId: sessionId });
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Không thể đổi phiên Zalo đang chọn.",
      },
      { status: 500 },
    );
  }
}
