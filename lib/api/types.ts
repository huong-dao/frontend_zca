export type UserRole = "ADMIN" | "USER";

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUserResponse {
  user: User;
}

export interface ApiMessageResponse {
  message: string;
}

export interface ApiErrorPayload {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export interface ZaloAccountChild {
  id: string;
  zaloId: string;
  name: string;
  groupCount: number;
}

export interface ZaloAccountMaster {
  id: string;
  zaloId: string;
  name: string;
  phone: string;
}

export interface ZaloAccount {
  id: string;
  zaloId: string;
  phone: string;
  name: string;
  isMaster: boolean;
  masterId: string | null;
  groupCount: number;
  createdAt: string;
  updatedAt: string;
  master: ZaloAccountMaster | null;
  children: ZaloAccountChild[];
}

export interface CreateZaloAccountPayload {
  zaloId: string;
  phone?: string;
  name?: string;
}

export interface CreateZaloAccountResponse {
  id: string;
  zaloId: string;
  phone: string;
  name: string;
  isMaster: boolean;
  masterId: string | null;
  groupCount: number;
  createdAt: string;
  updatedAt: string;
}
