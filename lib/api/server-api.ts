import "server-only";

import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

function buildUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function isJsonResponse(contentType: string | null) {
  return contentType?.includes("application/json") ?? false;
}

function normalizeErrorMessage(fallbackMessage: string, payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  const errorPayload = payload as { message?: unknown; error?: unknown };

  if (Array.isArray(errorPayload.message)) {
    return errorPayload.message.join(", ");
  }

  if (typeof errorPayload.message === "string" && errorPayload.message.trim()) {
    return errorPayload.message;
  }

  if (typeof errorPayload.error === "string" && errorPayload.error.trim()) {
    return errorPayload.error;
  }

  return fallbackMessage;
}

/**
 * Gọi API backend từ Route Handler / Server Action, forward cookie đăng nhập (access_token).
 */
export async function serverApiRequest<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: object | null } = {},
): Promise<T> {
  const { body, headers: initHeaders, ...rest } = options;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(initHeaders as Record<string, string>),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: body === undefined || body === null ? undefined : JSON.stringify(body),
    credentials: "include",
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type");
  const payload = isJsonResponse(contentType) ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(
      normalizeErrorMessage(`Request failed with status ${response.status}`, payload),
      response.status,
      payload,
    );
  }

  return payload as T;
}
