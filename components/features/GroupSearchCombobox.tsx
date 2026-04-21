"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { HiChevronDown, HiMagnifyingGlass } from "react-icons/hi2";
import { getZaloGroupsByAccountId } from "@/lib/api/zalo-groups";
import type { ZaloGroup } from "@/lib/api/types";

const SEARCH_LIMIT = 50;
const DEBOUNCE_MS = 320;

interface GroupSearchComboboxProps {
  accountId: string;
  disabled?: boolean;
  value: ZaloGroup | null;
  onChange: (group: ZaloGroup | null) => void;
  placeholder?: string;
}

export default function GroupSearchCombobox({
  accountId,
  disabled = false,
  value,
  onChange,
  placeholder = "Gõ để tìm nhóm…",
}: GroupSearchComboboxProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ZaloGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const skipDebounceRef = useRef(false);

  useEffect(() => {
    if (value) {
      setText(value.groupName);
    } else {
      setText("");
    }
  }, [value]);

  const fetchOptions = useCallback(
    async (query: string) => {
      if (!accountId) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        const trimmed = query.trim();
        const response = await getZaloGroupsByAccountId(accountId, {
          page: 1,
          limit: SEARCH_LIMIT,
          ...(trimmed ? { group_name: trimmed } : {}),
        });
        setOptions(response.data);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [accountId],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchOptions(text);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text, open, fetchOptions]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleFocus = () => {
    if (disabled) {
      return;
    }
    setOpen(true);
    skipDebounceRef.current = true;
    void fetchOptions(text);
  };

  const handleChangeText = (next: string) => {
    setText(next);
    if (value && next.trim() !== value.groupName.trim()) {
      onChange(null);
    }
  };

  const choose = (group: ZaloGroup) => {
    onChange(group);
    setText(group.groupName);
    setOpen(false);
  };

  const clearSelection = () => {
    onChange(null);
    setText("");
    setOptions([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex w-full items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${
          disabled ? "opacity-60" : ""
        }`}
      >
        <HiMagnifyingGlass className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
        <input
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/70"
          value={text}
          onChange={(event) => handleChangeText(event.target.value)}
          onFocus={handleFocus}
        />
        {value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              clearSelection();
            }}
            className="shrink-0 rounded px-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            Xóa
          </button>
        ) : (
          <HiChevronDown className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
        )}
      </div>

      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[60] mt-1 max-h-56 w-full overflow-auto rounded-lg border border-outline-variant/30 bg-surface-container-lowest py-1 shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-on-surface-variant">Đang tìm…</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-on-surface-variant">Không có nhóm phù hợp.</li>
          ) : (
            options.map((group) => (
              <li key={group.id} role="option">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-low"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(group)}
                >
                  <span className="font-medium">{group.groupName}</span>
                  <span className="ml-2 text-xs text-on-surface-variant">({group.groupZaloId})</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
