import { cookies } from "next/headers";
import { getPublicSession } from "@/lib/zalo/server";
import { readZaloSessionsPayload, writeZaloSessionsCookie } from "@/lib/zalo/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const payload = readZaloSessionsPayload(cookieStore);

  const publicSessions = await Promise.all(payload.ids.map((id) => getPublicSession(id)));
  const sessions = publicSessions.filter(
    (session): session is NonNullable<(typeof publicSessions)[number]> => session !== null,
  );

  const validIds = sessions.map((session) => session.id);
  let activeId = payload.active && validIds.includes(payload.active) ? payload.active : validIds[0] ?? null;

  if (validIds.length !== payload.ids.length || activeId !== payload.active) {
    writeZaloSessionsCookie(cookieStore, { ids: validIds, active: activeId });
  }

  const session = activeId ? await getPublicSession(activeId) : null;

  return Response.json({
    session,
    sessions,
    activeSessionId: activeId,
  });
}
