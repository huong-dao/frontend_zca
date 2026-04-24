import { apiRequest } from "@/lib/api/client";
import type {
  AdminUser,
  ApiMessageResponse,
  CreateUserPayload,
  PaginatedResponse,
  UpdateUserPayload,
} from "@/lib/api/types";

interface GetUsersParams {
  page?: number;
  limit?: number;
}

export function getUsers(params: GetUsersParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.page != null) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit != null) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();

  return apiRequest<PaginatedResponse<AdminUser>>(
    `/users${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
}

export function createUser(data: CreateUserPayload) {
  return apiRequest<AdminUser>("/users", {
    method: "POST",
    body: data,
  });
}

export function updateUser(id: string, data: UpdateUserPayload) {
  return apiRequest<AdminUser>(`/users/${id}`, {
    method: "PUT",
    body: data,
  });
}

export function deleteUser(id: string) {
  return apiRequest<ApiMessageResponse>(`/users/${id}`, {
    method: "DELETE",
  });
}
