import { cookies } from "next/headers";
import { fetchZaloSessionsList } from "@/lib/api/zalo-sessions";
import { mergeCookieAndClientHeaderPayload, writeZaloSessionsCookie } from "@/lib/zalo/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const merged = mergeCookieAndClientHeaderPayload(cookieStore, request);
  const { sessions: backendSessions } = await fetchZaloSessionsList();

  const backendIds = new Set(backendSessions.map((s) => s.id));
  let ids =
    merged.ids.length > 0 ? merged.ids.filter((id) => backendIds.has(id)) : backendSessions.map((s) => s.id);

  if (ids.length === 0) {
    ids = backendSessions.map((s) => s.id);
  }

  let activeId =
    merged.active && ids.includes(merged.active) ? merged.active : ids[0] ?? null;

  const sessions = ids
    .map((id) => backendSessions.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  writeZaloSessionsCookie(cookieStore, { ids: sessions.map((s) => s.id), active: activeId });

  const session = activeId ? sessions.find((s) => s.id === activeId) ?? null : null;

  return Response.json({
    session,
    sessions,
    activeSessionId: activeId,
  });
}
