import "server-only";

import { cookies } from "next/headers";
import { resolveZaloSessionId } from "@/lib/zalo/session-cookie";

/** Sau khi đã parse JSON body (nếu có), truyền sessionId từ body hoặc header. */
export async function getZaloSessionIdFromApiInput(
  bodySessionId?: string | null,
  headerSessionId?: string | null,
) {
  const cookieStore = await cookies();
  return resolveZaloSessionId(cookieStore, bodySessionId ?? headerSessionId);
}

export async function getZaloSessionIdFromGetRequest(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  const cookieStore = await cookies();
  return resolveZaloSessionId(cookieStore, sessionId);
}
