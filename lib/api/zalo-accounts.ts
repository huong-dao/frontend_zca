import { apiRequest } from "@/lib/api/client";
import type {
  AddChildZaloAccountsPayload,
  AddChildZaloAccountsResponse,
  CreateZaloAccountPayload,
  CreateZaloAccountResponse,
  MakeFriendZaloAccountsPayload,
  MakeFriendZaloAccountsResponse,
  SetZaloAccountMasterPayload,
  SetZaloAccountMasterResponse,
  UpdateFriendZaloAccountsPayload,
  UpdateFriendZaloAccountsResponse,
  UpdateZaloAccountGroupDataPayload,
  UpdateZaloAccountGroupDataResponse,
  ZaloAccountFilterType,
  ZaloAccount,
} from "@/lib/api/types";

export function getZaloAccounts() {
  return apiRequest<ZaloAccount[]>("/zalo-accounts", {
    method: "GET",
  });
}

export function filterZaloAccountsByType(type: Exclude<ZaloAccountFilterType, "all">) {
  return apiRequest<ZaloAccount[]>(`/zalo-accounts/filter?type=${type}`, {
    method: "GET",
  });
}

export function searchZaloAccounts(keyword: string) {
  return apiRequest<ZaloAccount[]>("/zalo-accounts/search", {
    method: "POST",
    body: { keyword },
  });
}

export function createZaloAccount(data: CreateZaloAccountPayload) {
  return apiRequest<CreateZaloAccountResponse>("/zalo-accounts", {
    method: "POST",
    body: data,
  });
}

export function addChildZaloAccounts(data: AddChildZaloAccountsPayload) {
  return apiRequest<AddChildZaloAccountsResponse>("/zalo-accounts/add-child", {
    method: "POST",
    body: data,
  });
}

export function makeFriendZaloAccounts(data: MakeFriendZaloAccountsPayload) {
  return apiRequest<MakeFriendZaloAccountsResponse>("/zalo-accounts/make-friend", {
    method: "POST",
    body: data,
  });
}

export function approveFriendZaloAccounts(data: UpdateFriendZaloAccountsPayload) {
  return apiRequest<UpdateFriendZaloAccountsResponse>("/zalo-accounts/approve-friend", {
    method: "PATCH",
    body: data,
  });
}

export function cancelFriendZaloAccounts(data: UpdateFriendZaloAccountsPayload) {
  return apiRequest<UpdateFriendZaloAccountsResponse>("/zalo-accounts/cancel-friend", {
    method: "PATCH",
    body: data,
  });
}

export function setZaloAccountMaster(data: SetZaloAccountMasterPayload) {
  return apiRequest<SetZaloAccountMasterResponse>(`/zalo-accounts/set-master/${data.id}`, {
    method: "PUT",
  });
}

export function updateZaloAccountGroupData(data: UpdateZaloAccountGroupDataPayload) {
  return apiRequest<UpdateZaloAccountGroupDataResponse>(`/zalo-accounts/${data.id}/group-data/`, {
    method: "PATCH",
    body: { groupData: data.groupData },
  });
}
