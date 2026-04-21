import { apiRequest } from "@/lib/api/client";
import type {
  BulkCreateZaloGroupsPayload,
  BulkCreateZaloGroupsResponse,
  InviteMemberToZaloGroupPayload,
  InviteMemberToZaloGroupResponse,
  PaginatedResponse,
  PendingNameUpdateZaloGroupsResponse,
  UpdateZaloGroupPayload,
  UpdateZaloGroupResponse,
  ZaloGroup,
} from "@/lib/api/types";

interface GetZaloGroupsParams {
  page?: number;
  limit?: number;
  /** Lọc chứa chuỗi (không phân biệt hoa thường), theo GET `/zalo-groups/account/:id?group_name=`. */
  group_name?: string;
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

  const trimmedName = params.group_name?.trim();
  if (trimmedName) {
    searchParams.set("group_name", trimmedName);
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

/** POST `/zalo-groups/invite-member` — gửi `groupId` hoặc `groupName` (không dùng UUID trên path). */
export function inviteMemberToZaloGroup(data: InviteMemberToZaloGroupPayload) {
  return apiRequest<InviteMemberToZaloGroupResponse>("/zalo-groups/invite-member", {
    method: "POST",
    body: data,
  });
}
