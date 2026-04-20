import { cookies } from "next/headers";
import { fetchZaloSessionsList } from "@/lib/api/zalo-sessions";
import { mergeCookieAndClientHeaderPayload, writeZaloSessionsCookie } from "@/lib/zalo/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const merged = mergeCookieAndClientHeaderPayload(cookieStore, request);
  const { sessions: backendSessions } = await fetchZaloSessionsList();

  // Luôn trả về đủ phiên từ backend; cookie/header chỉ dùng để chọn phiên đang active.
  const sessions = backendSessions;
  const ids = sessions.map((s) => s.id);

  const activeId =
    merged.active && ids.includes(merged.active) ? merged.active : ids[0] ?? null;

  writeZaloSessionsCookie(cookieStore, { ids: sessions.map((s) => s.id), active: activeId });

  const session = activeId ? sessions.find((s) => s.id === activeId) ?? null : null;

  return Response.json({
    session,
    sessions,
    activeSessionId: activeId,
  });
}
