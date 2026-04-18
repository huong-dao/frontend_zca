import { apiRequest } from "@/lib/api/client";
import type { PaginatedResponse, ZaloGroup } from "@/lib/api/types";

interface GetZaloGroupsParams {
  page?: number;
  limit?: number;
}

export function getZaloGroups(params: GetZaloGroupsParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();

  return apiRequest<PaginatedResponse<ZaloGroup>>(
    `/zalo-groups${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
}
