import type { ApiErrorPayload } from "@/lib/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

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
  /**
   * Hủy request sau N ms (AbortController). Dùng cho gửi file / thao tác nền lâu;
   * tránh treo mãi khi server hoặc reverse proxy chưa trả hỏi.
   */
  timeoutMs?: number;
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
  const { body, headers, timeoutMs, signal: userSignal, ...restOptions } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const timeoutController = new AbortController();
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (typeof timeoutMs === "number" && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      timeoutController.abort();
    }, timeoutMs);
  }

  if (userSignal) {
    if (userSignal.aborted) {
      timeoutController.abort();
    } else {
      userSignal.addEventListener("abort", () => timeoutController.abort(), { once: true });
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      ...restOptions,
      signal: timeoutController.signal,
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
  } catch (caught) {
    if (caught instanceof Error && caught.name === "AbortError" && timedOut) {
      throw new ApiError(
        "Hết thời gian chờ phản hồi từ server. Với gửi kèm file, kiểm tra log backend (Nest), phiên gọi Zalo, và tăng read_timeout / client_max_body_size ở reverse proxy (nginx) nếu có.",
        0,
      );
    }
    throw caught;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  const contentType = response.headers.get("content-type");
  const responsePayload = isJsonResponse(contentType) ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(
      normalizeErrorMessage(`Request failed with status ${response.status}`, responsePayload),
      response.status,
      responsePayload,
    );
  }

  return responsePayload as T;
}
