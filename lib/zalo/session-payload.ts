import type { ZaloSessionsPayload } from "@/lib/zalo/types";

export function parseZaloSessionsPayloadJson(raw: string | null): ZaloSessionsPayload | null {
  if (!raw?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ZaloSessionsPayload;
    if (!Array.isArray(parsed.ids)) {
      return null;
    }

    const ids = [...new Set(parsed.ids.filter((id): id is string => typeof id === "string" && id.length > 0))];
    const active =
      typeof parsed.active === "string" && ids.includes(parsed.active) ? parsed.active : ids[0] ?? null;

    return { ids, active };
  } catch {
    return null;
  }
}

export function mergeZaloSessionsPayloads(a: ZaloSessionsPayload, b: ZaloSessionsPayload | null): ZaloSessionsPayload {
  if (!b) {
    return a;
  }

  const ids = [...new Set([...a.ids, ...b.ids])];
  let active = a.active ?? b.active;

  if (active && !ids.includes(active)) {
    active = ids[0] ?? null;
  }

  if (!active && ids.length > 0) {
    active = ids[0] ?? null;
  }

  return { ids, active };
}

export function resolveZaloSessionIdFromMerged(
  merged: ZaloSessionsPayload,
  explicitSessionId?: string | null,
): string | null {
  const trimmed = explicitSessionId?.trim();
  if (trimmed) {
    return trimmed;
  }

  return merged.active;
}
