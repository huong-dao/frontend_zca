import type { SerializedCookie } from "tough-cookie";
import type { FindUserResponse, GroupInfoResponse } from "zca-js";

export type ZaloSerializedCookie = SerializedCookie;

export interface ZaloSessionCredentials {
  imei: string;
  userAgent: string;
  cookies: ZaloSerializedCookie[];
}

export interface ZaloSessionUser {
  uid: string;
  displayName: string;
  zaloName: string;
  username: string;
  phoneNumber: string;
  avatar: string;
  cover: string;
}

export interface ActiveZaloSession {
  id: string;
  user: ZaloSessionUser;
  credentials: ZaloSessionCredentials;
  createdAt: string;
  updatedAt: string;
}

export type PendingQrLoginStatus =
  | "initializing"
  | "qr_ready"
  | "scanned"
  | "authenticated"
  | "expired"
  | "declined"
  | "error";

export interface PendingQrLoginSnapshot {
  id: string;
  status: PendingQrLoginStatus;
  qrCode: string | null;
  error: string | null;
  scannedUser:
    | {
        displayName: string;
        avatar: string;
      }
    | null;
  sessionId: string | null;
  sessionUser: ZaloSessionUser | null;
  createdAt: string;
  updatedAt: string;
}

export type StartQrLoginResponse = PendingQrLoginSnapshot;

/** Danh sách session + session đang chọn (cookie và/hoặc fallback localStorage). */
export interface ZaloSessionsPayload {
  ids: string[];
  active: string | null;
}

/** Phiên Zalo trả về cho client (không chứa credentials). */
export interface ZaloSessionPublic {
  id: string;
  user: ZaloSessionUser;
  createdAt: string;
  updatedAt: string;
}

export interface ZaloSessionResponse {
  session: ZaloSessionPublic | null;
  sessions: ZaloSessionPublic[];
  activeSessionId: string | null;
}

export interface LogoutZaloResponse {
  success: boolean;
}

export interface FindUserByPhonePayload {
  phoneNumber: string;
}

export interface FindUserByPhoneResponse {
  user: FindUserResponse;
}

export interface GetQrByUserIdPayload {
  userId?: string | string[];
}

export interface GetQrByUserIdResponse {
  qrCodes: Record<string, string>;
}

export interface SendFriendRequestPayload {
  userId: string;
  message?: string;
}

export interface SendFriendRequestResponse {
  success: true;
}

export interface GetFriendRequestStatusResponse {
  addFriendPrivacy: number;
  isSeenFriendReq: boolean;
  is_friend: number;
  is_requested: number;
  is_requesting: number;
}

/** Kết quả từ zca-js `api.removeFriend` (theo tài liệu). */
export type RemoveFriendResponse = "";

export interface GetAllGroupsResult {
  version: string;
  gridVerMap: Record<string, string>;
}

export interface GetAllGroupsResponse {
  groups: GetAllGroupsResult;
}

export interface getGroupInfoPayload {
  groupInfo: GroupInfoResponse;
}