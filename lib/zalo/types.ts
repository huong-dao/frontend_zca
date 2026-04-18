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

export interface ZaloSessionResponse {
  session: {
    id: string;
    user: ZaloSessionUser;
    createdAt: string;
    updatedAt: string;
  } | null;
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