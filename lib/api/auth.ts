import { apiRequest } from "@/lib/api/client";
import type { ApiMessageResponse, AuthUserResponse, LoginPayload } from "@/lib/api/types";

export function login(data: LoginPayload) {
  return apiRequest<AuthUserResponse>("/auth/login", {
    method: "POST",
    body: data,
  });
}

export function logout() {
  return apiRequest<ApiMessageResponse>("/auth/logout", {
    method: "POST",
  });
}

export function getMe() {
  return apiRequest<AuthUserResponse>("/auth/me", {
    method: "GET",
  });
}
