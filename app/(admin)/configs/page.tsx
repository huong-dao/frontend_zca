"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/features/PageHeader";
import { useToast } from "@/components/features/Toast";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import { getConfigs, putConfigsBatch } from "@/lib/api/configs";
import { loadAppSettings, saveAppSettings } from "@/lib/config/app-settings";
import { HiClock } from "react-icons/hi2";

/** Mỗi mục: một key cấu hình trên server (PUT `/configs/batch`). Bổ sung mục mới: thêm phần tử vào đây. */
const CONFIG_FORM_FIELDS: {
  key: string;
  label: string;
  description: string;
  min: number;
  max: number;
}[] = [
  {
    key: "message_interval",
    label: "Thời gian giữa các lần gửi tin",
    description:
      "Khoảng tối thiểu (phút) giữa hai tin cùng người gửi tới cùng nhóm",
    min: 0,
    max: 10_080,
  },
];

const CONFIG_FORM_KEYS = CONFIG_FORM_FIELDS.map((f) => f.key);

function getDefaultValueForKey(key: string): string {
  if (key === "message_interval") {
    return "5";
  }
  return "";
}

function rowsToValueMap(
  rows: { key: string; value: string }[],
  keys: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    out[k] = getDefaultValueForKey(k);
  }
  for (const row of rows) {
    if (keys.includes(row.key)) {
      out[row.key] = row.value;
    }
  }
  return out;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ConfigsPage() {
  const { showToast } = useToast();
  const [valueByKey, setValueByKey] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const f of CONFIG_FORM_FIELDS) {
      o[f.key] = getDefaultValueForKey(f.key);
    }
    return o;
  });
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const loadFromApi = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const rows = await getConfigs();
      setValueByKey(rowsToValueMap(rows, CONFIG_FORM_KEYS));
    } catch (e) {
      setLoadError(getErrorMessage(e, "Không thể tải cấu hình từ server (cần quyền ADMIN)."));
      setValueByKey((prev) => {
        const next = { ...prev };
        const fromLocal = loadAppSettings();
        const minFromMs = Math.round(fromLocal.messageSendIntervalMs / 60_000);
        if (Number.isFinite(minFromMs) && minFromMs >= 0) {
          next.message_interval = String(minFromMs);
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFromApi();
  }, [loadFromApi]);

  const buildBatchEntries = useCallback((): { key: string; value: string }[] => {
    return CONFIG_FORM_FIELDS.map((field) => ({
      key: field.key,
      value: (valueByKey[field.key] ?? "").trim() || "0",
    }));
  }, [valueByKey]);

  const validate = useCallback((): string | null => {
    for (const field of CONFIG_FORM_FIELDS) {
      const raw = (valueByKey[field.key] ?? "").trim() || "0";
      if (raw.length > 255) {
        return `Giá trị cho "${field.key}" quá dài (tối đa 255 ký tự).`;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        return `${field.label}: nhập số nguyên.`;
      }
      if (n < field.min || n > field.max) {
        return `${field.label}: phải từ ${field.min} đến ${field.max}.`;
      }
    }
    return null;
  }, [valueByKey]);

  const handleSave = useCallback(async () => {
    setFieldError("");
    const err = validate();
    if (err) {
      setFieldError(err);
      return;
    }

    const entries = buildBatchEntries();
    if (entries.length === 0) {
      setFieldError("Không có trường cấu hình để lưu.");
      return;
    }

    setSubmitting(true);
    try {
      const saved = await putConfigsBatch({ entries });
      const map = saved.reduce<Record<string, string>>((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {});
      setValueByKey((prev) => {
        const next = { ...prev };
        for (const k of CONFIG_FORM_KEYS) {
          if (map[k] != null) {
            next[k] = map[k]!;
          }
        }
        return next;
      });
      const intervalMin = Number(map.message_interval ?? valueByKey.message_interval);
      if (Number.isFinite(intervalMin) && intervalMin >= 0) {
        saveAppSettings({
          ...loadAppSettings(),
          messageSendIntervalMs: Math.round(intervalMin * 60_000),
        });
      }
      showToast("Đã lưu cấu hình lên server.", "success");
    } catch (e) {
      showToast(getErrorMessage(e, "Không thể lưu cấu hình."), "error");
    } finally {
      setSubmitting(false);
    }
  }, [buildBatchEntries, showToast, validate, valueByKey]);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Cấu hình"
        description="Cấu hình lưu trên server. Mỗi lần Lưu sẽ gửi tất cả trường bên dưới tới API (PUT /configs/batch)."
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
            {loading ? (
              <p className="text-sm text-on-surface-variant">Đang tải cấu hình...</p>
            ) : null}
            {loadError ? (
              <p className="mb-4 text-sm text-error" role="alert">
                {loadError}
              </p>
            ) : null}
            {!loading ? (
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSave();
                }}
              >
                {CONFIG_FORM_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label
                      className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-widest text-on-surface-variant"
                      htmlFor={`config-${field.key}`}
                    >
                      <HiClock className="h-4 w-4 text-primary" aria-hidden />
                      {field.label}
                    </label>
                    <p className="text-sm text-on-surface-variant">{field.description}</p>
                    <div className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        id={`config-${field.key}`}
                        name={field.key}
                        type="number"
                        min={field.min}
                        max={field.max}
                        step={1}
                        value={valueByKey[field.key] ?? ""}
                        onChange={(e) => {
                          setFieldError("");
                          setValueByKey((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }));
                        }}
                        className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-sm text-on-surface shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      {field.key === "message_interval" ? (
                        <span className="shrink-0 text-sm font-medium text-on-surface-variant">phút</span>
                      ) : null}
                    </div>
                  </div>
                ))}

                {fieldError ? <FormError message={fieldError} /> : null}

                <div className="flex flex-wrap gap-3 border-t border-outline-variant/10 pt-6">
                  <Button type="submit" variant="primary" loading={submitting}>
                    Lưu cấu hình
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={submitting || loading}
                    onClick={() => {
                      setFieldError("");
                      void loadFromApi();
                      showToast("Đã tải lại từ server.", "info");
                    }}
                  >
                    Hoàn tác
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
