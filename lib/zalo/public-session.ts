import "server-only";

import { fetchZaloSessionsList } from "@/lib/api/zalo-sessions";
import type { ZaloSessionPublic } from "@/lib/zalo/types";

/** Phiên public theo id — lấy từ `GET /zalo-sessions` (không gọi zca-js trên Next). */
export async function getPublicSession(sessionId: string | null | undefined): Promise<ZaloSessionPublic | null> {
  if (!sessionId?.trim()) {
    return null;
  }

  const { sessions } = await fetchZaloSessionsList();

  return sessions.find((s) => s.id === sessionId) ?? null;
}
