import { cookies } from "next/headers";
import { getPublicSession } from "@/lib/zalo/server";
import { readZaloSessionsPayload, writeZaloSessionsCookie } from "@/lib/zalo/session-cookie";

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
    const payload = readZaloSessionsPayload(cookieStore);

    if (!payload.ids.includes(sessionId) || !(await getPublicSession(sessionId))) {
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
