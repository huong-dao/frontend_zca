import "server-only";

import { serverApiRequest } from "@/lib/api/server-api";
import type { ActiveZaloSession, ZaloSessionCredentials, ZaloSessionUser } from "@/lib/zalo/types";

/** Phản hồi public từ backend (không có credentials). */
export interface ZaloSessionPublicDto {
  id: string;
  user: ZaloSessionUser;
  createdAt: string;
  updatedAt: string;
}

/** Phản hồi đầy đủ từ backend (có credentials). */
export interface ZaloSessionFullDto extends ZaloSessionPublicDto {
  credentials: ZaloSessionCredentials;
}

function mapDtoToActive(dto: ZaloSessionFullDto): ActiveZaloSession {
  return {
    id: dto.id,
    user: dto.user,
    credentials: dto.credentials,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export async function fetchFullZaloSessionFromBackend(sessionId: string): Promise<ActiveZaloSession | null> {
  try {
    const dto = await serverApiRequest<ZaloSessionFullDto>(`/zalo-sessions/${encodeURIComponent(sessionId)}`, {
      method: "GET",
    });
    return mapDtoToActive(dto);
  } catch {
    return null;
  }
}

export async function upsertZaloSessionToBackend(session: ActiveZaloSession): Promise<void> {
  await serverApiRequest<ZaloSessionPublicDto>("/zalo-sessions", {
    method: "POST",
    body: {
      id: session.id,
      user: session.user,
      credentials: session.credentials,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
  });
}

export async function deleteZaloSessionOnBackend(sessionId: string): Promise<void> {
  await serverApiRequest(`/zalo-sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
}

export async function deleteAllZaloSessionsOnBackend(): Promise<void> {
  await serverApiRequest<unknown>("/zalo-sessions", {
    method: "DELETE",
  });
}

export async function touchZaloSessionOnBackend(sessionId: string): Promise<void> {
  await serverApiRequest<ZaloSessionPublicDto>(
    `/zalo-sessions/${encodeURIComponent(sessionId)}/touch`,
    {
      method: "PATCH",
    },
  );
}
