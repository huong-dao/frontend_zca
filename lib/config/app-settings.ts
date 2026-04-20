/**
 * Cấu hình ứng dụng lưu trên trình duyệt (localStorage).
 * Khi có API backend, có thể thay get/save bằng gọi server và giữ cùng shape `AppSettings`.
 */

const STORAGE_KEY = "zca_app_settings";

export interface AppSettings {
  /** Khoảng cách tối thiểu giữa hai lần gửi tin (milliseconds). */
  messageSendIntervalMs: number;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  messageSendIntervalMs: 5000,
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function loadAppSettings(): AppSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_APP_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_APP_SETTINGS };
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const messageSendIntervalMs = clamp(
      typeof parsed.messageSendIntervalMs === "number" && Number.isFinite(parsed.messageSendIntervalMs)
        ? Math.round(parsed.messageSendIntervalMs)
        : DEFAULT_APP_SETTINGS.messageSendIntervalMs,
      1000,
      86_400_000,
    );
    return {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
      messageSendIntervalMs,
    };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Dùng từ module gửi tin / automation — luôn trả về số hợp lệ. */
export function getMessageSendIntervalMs(): number {
  return loadAppSettings().messageSendIntervalMs;
}
