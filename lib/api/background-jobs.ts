import { apiRequest } from "@/lib/api/client";
import type { ChildGroupScanRunningStatus, GroupMetadataSyncStatus } from "@/lib/api/types";

/** Trạng thái cron/worker đồng bộ metadata nhóm (master). Cho phép `ADMIN` và `USER`. */
export function getGroupMetadataSyncStatus() {
  return apiRequest<GroupMetadataSyncStatus>("/background-jobs/group-metadata-sync/status", {
    method: "GET",
  });
}

/** Các child đang có job quét nhóm RUNNING trong DB (có thể nhiều bản ghi song song). */
export function listChildGroupScanStatus() {
  return apiRequest<ChildGroupScanRunningStatus[]>("/background-jobs/child-group-scan/status", {
    method: "GET",
  });
}
