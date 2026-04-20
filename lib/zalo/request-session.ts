import "server-only";

import { cookies } from "next/headers";
import { mergeCookieAndClientHeaderPayload } from "@/lib/zalo/session-cookie";
import { resolveZaloSessionIdFromMerged } from "@/lib/zalo/session-payload";

/** Sau khi đã parse JSON body (nếu có), truyền sessionId từ body hoặc header; merge với `X-Zalo-Client-Sessions` khi cookie thiếu. */
export async function getZaloSessionIdFromApiInput(
  request: Request,
  bodySessionId?: string | null,
  headerSessionId?: string | null,
) {
  const cookieStore = await cookies();
  const merged = mergeCookieAndClientHeaderPayload(cookieStore, request);

  return resolveZaloSessionIdFromMerged(merged, bodySessionId ?? headerSessionId);
}

export async function getZaloSessionIdFromGetRequest(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  const cookieStore = await cookies();
  const merged = mergeCookieAndClientHeaderPayload(cookieStore, request);

  return resolveZaloSessionIdFromMerged(merged, sessionId);
}
