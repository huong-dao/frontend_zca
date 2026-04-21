"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/features/PageHeader";
import { useToast } from "@/components/features/Toast";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import {
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  saveAppSettings,
  type AppSettings,
} from "@/lib/config/app-settings";
import { HiClock } from "react-icons/hi2";

function msToSeconds(ms: number) {
  return Math.round(ms / 1000);
}

function secondsToMs(seconds: number) {
  return Math.round(seconds * 1000);
}

export default function ConfigsPage() {
  const { showToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [messageIntervalSeconds, setMessageIntervalSeconds] = useState(
    msToSeconds(DEFAULT_APP_SETTINGS.messageSendIntervalMs),
  );
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    setMounted(true);
    const s = loadAppSettings();
    setMessageIntervalSeconds(msToSeconds(s.messageSendIntervalMs));
  }, []);

  const handleSave = useCallback(async () => {
    setFieldError("");

    if (!Number.isFinite(messageIntervalSeconds) || messageIntervalSeconds < 1) {
      setFieldError("Thời gian phải là số nguyên dương (tối thiểu 1 giây).");
      return;
    }

    if (messageIntervalSeconds > 86_400) {
      setFieldError("Giá trị quá lớn (tối đa 86400 giây / 24 giờ).");
      return;
    }

    const next: AppSettings = {
      ...loadAppSettings(),
      messageSendIntervalMs: secondsToMs(messageIntervalSeconds),
    };

    setSubmitting(true);
    try {
      saveAppSettings(next);
      showToast("Đã lưu cấu hình.", "success");
    } catch {
      showToast("Không thể lưu cấu hình.", "error");
    } finally {
      setSubmitting(false);
    }
  }, [messageIntervalSeconds, showToast]);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Cấu hình"
        description="Thiết lập thông số chung của hệ thống. Có thể bổ sung thêm mục cấu hình sau này."
      />

      <div className="">
        <section className="lg:col-span-7 overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm shadow-slate-200/50">
          <div className="border-b border-outline-variant/10 px-6 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-on-surface">Gửi tin nhắn</h3>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            {!mounted ? (
              <p className="text-sm text-on-surface-variant">Đang tải cấu hình...</p>
            ) : (
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSave();
                }}
              >
                <div className="space-y-2">
                  <label
                    className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-widest text-on-surface-variant"
                    htmlFor="message-send-interval"
                  >
                    <HiClock className="h-4 w-4 text-primary" aria-hidden />
                    Thời gian giữa các lần gửi tin
                  </label>
                  <p className="text-sm text-on-surface-variant">
                    Nhập số giây chờ giữa hai tin gửi liên tiếp (áp dụng cho luồng gửi tin tự động / hàng loạt).
                  </p>
                  <div className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      id="message-send-interval"
                      name="messageSendIntervalSeconds"
                      type="number"
                      min={1}
                      max={86400}
                      step={1}
                      value={messageIntervalSeconds}
                      onChange={(e) => {
                        setFieldError("");
                        const v = e.target.value === "" ? 0 : Number(e.target.value);
                        setMessageIntervalSeconds(Number.isFinite(v) ? v : 0);
                      }}
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="shrink-0 text-sm font-medium text-on-surface-variant">phút</span>
                  </div>
                  {fieldError ? <FormError message={fieldError} /> : null}
                </div>

                <div className="flex flex-wrap gap-3 border-t border-outline-variant/10 pt-6">
                  <Button type="submit" variant="primary" loading={submitting}>
                    Lưu cấu hình
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={submitting}
                    onClick={() => {
                      setFieldError("");
                      const s = loadAppSettings();
                      setMessageIntervalSeconds(msToSeconds(s.messageSendIntervalMs));
                      showToast("Đã khôi phục giá trị đang lưu.", "info");
                    }}
                  >
                    Hoàn tác
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>

        
      </div>
    </div>
  );
}
