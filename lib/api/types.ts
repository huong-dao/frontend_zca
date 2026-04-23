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
  /** Khi `INACTIVE`, không còn thao tác mời vào nhóm (theo nghiệp vụ backend). */
  status?: "ACTIVE" | "INACTIVE";
}

export interface ZaloAccountFriend {
  status: "PENDING" | "APPROVE" | "CANCEL";
  relationId: string;
  linkedAt: string;
  id: string;
  zaloId: string;
  phone: string;
  name: string;
  isMaster: boolean;
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
  status: "ACTIVE" | "INACTIVE";
  groupCount: number;
  groupData: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  master: ZaloAccountMaster | null;
  children: ZaloAccountChild[];
  friends: ZaloAccountFriend[];
}

export type ZaloAccountFilterType = "all" | "master" | "child";

export interface AddChildZaloAccountsPayload {
  masterId: string;
  childIds: string[];
}

export interface AddChildZaloAccountsResponse {
  linkedChildIds: string[];
  skippedExistingChildIds: string[];
  duplicateInputChildIds: string[];
  summary: {
    requested: number;
    uniqueRequested: number;
    linked: number;
    skippedExisting: number;
    skippedDuplicateInput: number;
  };
}

export interface MakeFriendZaloAccountsPayload {
  masterId: string;
  friendId: string;
}

export interface MakeFriendZaloAccountsResponse {
  id: string;
  createdAt: string;
  status: "PENDING";
  master: {
    id: string;
    zaloId: string;
    phone: string;
    name: string;
    isMaster: boolean;
  };
  friend: {
    id: string;
    zaloId: string;
    phone: string;
    name: string;
    isMaster: boolean;
  };
}

export interface UpdateFriendZaloAccountsPayload {
  masterId: string;
  friendId: string;
}

export interface UpdateFriendZaloAccountsResponse {
  message: string;
  updated: {
    id: string;
    createdAt: string;
    status: "APPROVE" | "CANCEL";
    master: {
      id: string;
      zaloId: string;
      phone: string;
      name: string;
      isMaster: boolean;
    };
    friend: {
      id: string;
      zaloId: string;
      phone: string;
      name: string;
      isMaster: boolean;
    };
  };
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
  groupData: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface SetZaloAccountMasterPayload {
  id: string;
}

export interface SetZaloAccountMasterResponse {
  id: string;
  zaloId: string;
  phone: string;
  name: string;
  isMaster: boolean;
  masterId: string | null;
  groupCount: number;
  groupData: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

/** DELETE `/zalo-accounts/:id` — soft delete. */
export interface DeleteZaloAccountResponse {
  message: string;
  id: string;
  isDeleted: boolean;
  deletedAt?: string;
  loginSessionsRemoved: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ZaloGroupCounts {
  accountMaps: number;
  messages: number;
}

export interface ZaloGroup {
  id: string;
  groupName: string;
  groupZaloId: string;
  /** Global id nhóm từ Zalo (E2E / định danh chuỗi), nếu backend đồng bộ. */
  globalId?: string;
  originName: string;
  isUpdateName: boolean;
  createdAt: string;
  updatedAt: string;
  _count: ZaloGroupCounts;
}

export interface BulkCreateZaloGroupInput {
  group_name: string;
  group_zalo_id: string;
}

export interface BulkCreateZaloGroupsPayload {
  groups: BulkCreateZaloGroupInput[];
  /** Khi `"update origin name"`: cập nhật `originName` cho `group_zalo_id` đã tồn tại thay vì chỉ skip. */
  mode?: "update origin name";
}

export interface BulkCreateZaloGroupsCreatedItem {
  id: string;
  groupName: string;
  isUpdateName: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BulkCreateZaloGroupsResponse {
  created: BulkCreateZaloGroupsCreatedItem[];
  skipped: {
    existingGroupZaloIds: string[];
    duplicateInputGroupZaloIds: string[];
  };
  summary: {
    requested: number;
    uniqueRequested: number;
    created: number;
    skippedExisting: number;
    skippedDuplicateInput: number;
  };
}

export type PendingNameUpdateZaloGroupsResponse = ZaloGroup[];

export interface UpdateZaloGroupPayload {
  group_name: string;
  group_zalo_id: string;
  global_id?: string;
}

export interface UpdateZaloGroupResponse {
  id: string;
  groupName: string;
  globalId?: string;
  isUpdateName: boolean;
  createdAt: string;
  updatedAt: string;
}

/** POST `/zalo-groups/invite-member` — có `groupId` thì bỏ qua lookup theo tên. */
export interface InviteMemberToZaloGroupPayload {
  sessionId: string;
  masterZaloAccountId: string;
  phoneNumber?: string;
  /** Gửi để đồng bộ DB sau khi mời thành công; phải là child của master. */
  childZaloAccountId: string;
  /** UUID `ZaloGroup.id`; khi có thì không dùng `groupName` để lookup. */
  groupId?: string;
  /** Bắt buộc khi không gửi `groupId` — khớp `zalo_groups.group_name` (theo master). */
  groupName?: string;
}

export interface InviteMemberToZaloGroupResponse {
  success: boolean;
  masterGroupZaloId?: string;
  inviteUid?: string;
  findUser?: {
    display_name?: string;
    globalId?: string;
  };
  zalo?: {
    errorMembers?: unknown[];
    error_data?: Record<string, unknown>;
  };
  dbSync?: {
    persisted: boolean;
    created?: boolean;
    childZaloAccountId?: string;
    groupZaloId?: string;
    groupId?: string;
    reason?: string;
  };
}

/** Cùng body với mời thành viên. POST `/zalo-groups/remove-member` */
export type RemoveMemberFromZaloGroupPayload = InviteMemberToZaloGroupPayload;

export interface RemoveMemberFromZaloGroupResponse {
  success: boolean;
  masterGroupZaloId?: string;
  removedMemberUid?: string;
  findUser?: {
    display_name?: string;
    globalId?: string;
  };
  zalo?: {
    errorMembers?: unknown[];
  };
  dbSync?: {
    persisted: boolean;
    childZaloAccountId?: string;
    groupId?: string;
    reason?: string;
  };
}

export interface SendMessagePayload {
  zaloAccountId: string;
  groupId: string;
  /** Có thể rỗng nếu gửi kèm `files` (multipart). */
  text?: string;
  /** Tối đa 20 file, mỗi file tối đa 25 MB (theo server). */
  files?: File[];
}

export interface SendMessagePersistedRow {
  id: string;
  messageZaloId: string | null;
  cliMsgId: string | null;
  uidFrom: string;
  content: string;
  senderId: string;
  groupId: string;
  sentAt: string;
  status: string;
  createdAt: string;
}

export interface SendMessageResponse {
  result: unknown;
  message: SendMessagePersistedRow;
}

export type MessageLogStatus = "SENT" | "FAILED" | "RECALL";

export interface MessageLogSender {
  id: string;
  zaloId: string;
  name: string;
  phone: string;
  isDeleted: boolean;
  deletedAt: string | null;
}

export interface MessageLogGroup {
  id: string;
  groupName: string;
  groupZaloId: string;
}

/** GET `/messages` — một dòng trong `data`. */
export interface MessageLog {
  id: string;
  messageZaloId: string | null;
  cliMsgId: string | null;
  uidFrom: string;
  content: string;
  senderId: string;
  groupId: string;
  sentAt: string;
  status: MessageLogStatus;
  createdAt: string;
  sender: MessageLogSender;
  group: MessageLogGroup;
}

export interface ChildGroupScanPayload {
  sessionId: string;
}

export interface ChildGroupScanResponse {
  enqueued: boolean;
  zaloAccountId: string;
  status: "INACTIVE";
}

export interface UpdateZaloAccountGroupDataPayload {
  id: string;
  groupData: Record<string, string>;
}

export interface UpdateZaloAccountGroupDataResponse {
  id: string;
  zaloId: string;
  phone: string;
  name: string;
  isMaster: boolean;
  masterId: string | null;
  groupCount: number;
  groupData: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}