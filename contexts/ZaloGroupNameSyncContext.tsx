"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPendingNameUpdateZaloGroups,
  updateZaloGroup,
} from "@/lib/api/zalo-groups";
import { getCurrentZaloSession, getGroupInfo } from "@/lib/zalo/client";

// Đổi cờ này thành false nếu muốn tạm tắt toàn bộ đồng bộ tên nhóm.
const ENABLE_ZALO_GROUP_NAME_SYNC = true;
const SYNC_INTERVAL_MS = 3 * 60 * 1000;
const SYNC_BATCH_SIZE = 10;
const GROUP_REQUEST_DELAY_MS = 2000;

interface ZaloGroupNameSyncContextValue {
  isSyncing: boolean;
  currentBatchSize: number;
  pendingCount: number;
  lastCompletedAt: string | null;
  lastError: string | null;
}

const ZaloGroupNameSyncContext = createContext<ZaloGroupNameSyncContextValue | undefined>(undefined);

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getReadableGroupName(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractGroupNameFromGroupInfo(groupId: string, payload: unknown) {
  const queue: unknown[] = [payload];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    const record = current as Record<string, unknown>;
    const nestedByGroupId = record[groupId];

    if (nestedByGroupId) {
      queue.unshift(nestedByGroupId);
    }

    const groupName =
      getReadableGroupName(record.groupName) ??
      getReadableGroupName(record.group_name) ??
      getReadableGroupName(record.name) ??
      getReadableGroupName(record.gridName) ??
      getReadableGroupName(record.title) ??
      getReadableGroupName(record.subject);

    if (groupName) {
      return groupName;
    }

    queue.push(...Object.values(record));
  }

  return null;
}

export function ZaloGroupNameSyncProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentBatchSize, setCurrentBatchSize] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);

  const runSyncCycle = useCallback(async () => {
    if (!ENABLE_ZALO_GROUP_NAME_SYNC || loading || !user || syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;
    setLastError(null);

    try {
      const sessionResponse = await getCurrentZaloSession();

      if (!sessionResponse.session) {
        setIsSyncing(false);
        setCurrentBatchSize(0);
        setPendingCount(0);
        return;
      }

      const allPendingGroups = await getPendingNameUpdateZaloGroups();
      const pendingBatch = allPendingGroups.slice(0, SYNC_BATCH_SIZE);

      setPendingCount(allPendingGroups.length);

      if (pendingBatch.length === 0) {
        setIsSyncing(false);
        setCurrentBatchSize(0);
        return;
      }

      setIsSyncing(true);
      setCurrentBatchSize(pendingBatch.length);

      for (let index = 0; index < pendingBatch.length; index += 1) {
        const group = pendingBatch[index];

        try {
          const groupInfoResponse = await getGroupInfo(group.groupZaloId);
          const updatedGroupName =
            extractGroupNameFromGroupInfo(group.groupZaloId, groupInfoResponse.groupInfo) ??
            group.groupName;

          await updateZaloGroup(group.id, {
            group_name: updatedGroupName,
            group_zalo_id: group.groupZaloId,
          });
        } catch (requestError) {
          setLastError(
            requestError instanceof Error
              ? requestError.message
              : "Có nhóm chưa thể cập nhật tên trong đợt đồng bộ này.",
          );
        }

        if (index < pendingBatch.length - 1) {
          await sleep(GROUP_REQUEST_DELAY_MS);
        }
      }

      const remainingPendingGroups = await getPendingNameUpdateZaloGroups();
      setPendingCount(remainingPendingGroups.length);
      setLastCompletedAt(new Date().toISOString());
    } catch (requestError) {
      setLastError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể chạy đồng bộ tên nhóm Zalo.",
      );
    } finally {
      setIsSyncing(false);
      setCurrentBatchSize(0);
      syncInFlightRef.current = false;
    }
  }, [loading, user]);

  useEffect(() => {
    if (!ENABLE_ZALO_GROUP_NAME_SYNC || loading || !user) {
      setIsSyncing(false);
      setCurrentBatchSize(0);
      setPendingCount(0);
      setLastError(null);
      return;
    }

    void runSyncCycle();

    const intervalId = window.setInterval(() => {
      void runSyncCycle();
    }, SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loading, runSyncCycle, user]);

  const value = useMemo(
    () => ({
      isSyncing,
      currentBatchSize,
      pendingCount,
      lastCompletedAt,
      lastError,
    }),
    [currentBatchSize, isSyncing, lastCompletedAt, lastError, pendingCount],
  );

  return (
    <ZaloGroupNameSyncContext.Provider value={value}>
      {children}
    </ZaloGroupNameSyncContext.Provider>
  );
}

export function useZaloGroupNameSync() {
  const context = useContext(ZaloGroupNameSyncContext);

  if (!context) {
    throw new Error("useZaloGroupNameSync must be used within ZaloGroupNameSyncProvider");
  }

  return context;
}
