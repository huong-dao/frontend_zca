import type { ZaloSessionsPayload } from "@/lib/zalo/types";
import { parseZaloSessionsPayloadJson } from "@/lib/zalo/session-payload";

export const ZALO_CLIENT_SESSIONS_KEY = "zca_zalo_client_sessions";

export function readClientZaloSessionState(): ZaloSessionsPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  return parseZaloSessionsPayloadJson(localStorage.getItem(ZALO_CLIENT_SESSIONS_KEY));
}

export function writeClientZaloSessionState(payload: ZaloSessionsPayload): void {
  if (typeof window === "undefined") {
    return;
  }

  const ids = [...new Set(payload.ids.filter(Boolean))];
  let active = payload.active;

  if (ids.length === 0) {
    localStorage.removeItem(ZALO_CLIENT_SESSIONS_KEY);
    return;
  }

  if (!active || !ids.includes(active)) {
    active = ids[0] ?? null;
  }

  localStorage.setItem(ZALO_CLIENT_SESSIONS_KEY, JSON.stringify({ ids, active }));
}

export function getZaloClientSessionsHeaderValue(): string | null {
  const state = readClientZaloSessionState();
  if (!state || state.ids.length === 0) {
    return null;
  }

  return JSON.stringify({ ids: state.ids, active: state.active });
}

export function appendClientSessionId(sessionId: string): void {
  const current = readClientZaloSessionState() ?? { ids: [], active: null };
  const ids = current.ids.includes(sessionId) ? current.ids : [...current.ids, sessionId];

  writeClientZaloSessionState({ ids, active: sessionId });
}

export function removeClientSessionId(sessionId: string): void {
  const current = readClientZaloSessionState();
  if (!current) {
    return;
  }

  const ids = current.ids.filter((id) => id !== sessionId);
  let active = current.active === sessionId ? ids[0] ?? null : current.active;

  if (active && !ids.includes(active)) {
    active = ids[0] ?? null;
  }

  writeClientZaloSessionState({ ids, active });
}

export function clearClientZaloSessionState(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ZALO_CLIENT_SESSIONS_KEY);
}

export function setActiveClientSessionId(sessionId: string): void {
  const current = readClientZaloSessionState();

  if (!current?.ids.includes(sessionId)) {
    appendClientSessionId(sessionId);
    return;
  }

  writeClientZaloSessionState({ ...current, active: sessionId });
}

export function syncClientZaloSessionsFromServer(sessions: { id: string }[], activeSessionId: string | null): void {
  const ids = [...new Set(sessions.map((s) => s.id))];

  if (!ids.length) {
    clearClientZaloSessionState();
    return;
  }

  let active = activeSessionId;

  if (active && !ids.includes(active)) {
    active = ids[0] ?? null;
  }

  if (!active) {
    active = ids[0] ?? null;
  }

  writeClientZaloSessionState({ ids, active });
}
