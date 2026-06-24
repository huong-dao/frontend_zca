import { apiRequest } from "@/lib/api/client";
import type { MediaItem, PaginatedResponse } from "@/lib/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

export interface GetMediaParams {
  page?: number;
  limit?: number;
  fileName?: string;
  sentFrom?: string;
  sentTo?: string;
}

export function getMedia(params: GetMediaParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set("page", String(params.page));
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.fileName?.trim()) {
    searchParams.set("fileName", params.fileName.trim());
  }
  if (params.sentFrom) {
    searchParams.set("sentFrom", params.sentFrom);
  }
  if (params.sentTo) {
    searchParams.set("sentTo", params.sentTo);
  }

  const queryString = searchParams.toString();

  return apiRequest<PaginatedResponse<MediaItem>>(`/media${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });
}

export interface DeleteMediaResponse {
  message: string;
  id: string;
  fileName: string;
}

export interface DeleteMediaBatchResponse {
  message: string;
  deletedCount: number;
  ids: string[];
}

/** DELETE `/media/:id` — xóa một file media và bản ghi trên server. */
export function deleteMedia(mediaId: string) {
  return apiRequest<DeleteMediaResponse>(`/media/${encodeURIComponent(mediaId)}`, {
    method: "DELETE",
  });
}

/** DELETE `/media/batch` — xóa nhiều file (tối đa 100 id, all-or-nothing). */
export function deleteMediaBatch(ids: string[]) {
  return apiRequest<DeleteMediaBatchResponse>("/media/batch", {
    method: "DELETE",
    body: { ids },
  });
}

export function buildMediaFileUrl(mediaId: string) {
  return `${API_BASE_URL}/media/${encodeURIComponent(mediaId)}/file`;
}

export async function downloadMediaFile(mediaId: string, fileName: string) {
  const response = await fetch(buildMediaFileUrl(mediaId), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Không thể tải file (HTTP ${response.status}).`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function openMediaFileInNewTab(mediaId: string) {
  const response = await fetch(buildMediaFileUrl(mediaId), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Không thể mở file (HTTP ${response.status}).`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
