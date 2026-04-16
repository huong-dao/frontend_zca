import type { ApiErrorPayload } from "@/lib/api/types";

const API_BASE_URL = "http://221.132.21.163:3000";

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload | unknown;

  constructor(message: string, status: number, payload?: ApiErrorPayload | unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | object | null;
};

function buildUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function isJsonResponse(contentType: string | null) {
  return contentType?.includes("application/json") ?? false;
}

function normalizeErrorMessage(
  fallbackMessage: string,
  payload?: ApiErrorPayload | unknown,
) {
  if (!payload || typeof payload !== "object") {
    return fallbackMessage;
  }

  const errorPayload = payload as ApiErrorPayload;

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

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...restOptions } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(buildUrl(path), {
    ...restOptions,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body:
      body == null || typeof body === "string" || body instanceof Blob || isFormData
        ? (body as BodyInit | null | undefined)
        : JSON.stringify(body),
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
