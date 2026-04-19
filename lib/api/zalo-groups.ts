import { apiRequest } from "@/lib/api/client";
import type {
  BulkCreateZaloGroupsPayload,
  BulkCreateZaloGroupsResponse,
  PaginatedResponse,
  PendingNameUpdateZaloGroupsResponse,
  UpdateZaloGroupPayload,
  UpdateZaloGroupResponse,
  ZaloGroup,
} from "@/lib/api/types";

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

export function getZaloGroupsByAccountId(accountId: string, params: GetZaloGroupsParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const queryString = searchParams.toString();

  return apiRequest<PaginatedResponse<ZaloGroup>>(
    `/zalo-groups/account/${accountId}${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    },
  );
}

export function createZaloGroupsBulk(accountId: string, data: BulkCreateZaloGroupsPayload) {
  return apiRequest<BulkCreateZaloGroupsResponse>(`/zalo-groups/bulk/${accountId}`, {
    method: "POST",
    body: data,
  });
}

export function getPendingNameUpdateZaloGroups() {
  return apiRequest<PendingNameUpdateZaloGroupsResponse>("/zalo-groups/pending-name-update", {
    method: "GET",
  });
}

export function updateZaloGroup(groupId: string, data: UpdateZaloGroupPayload) {
  return apiRequest<UpdateZaloGroupResponse>(`/zalo-groups/${groupId}`, {
    method: "PUT",
    body: data,
  });
}
