"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { HiChevronDown, HiMagnifyingGlass } from "react-icons/hi2";

export interface ChildAccountFilterOption {
  id: string;
  name: string;
  phone: string;
}

function formatChildLabel(option: ChildAccountFilterOption) {
  const phone = option.phone.trim();
  return phone ? `${option.name} · ${phone}` : option.name;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function childMatchesQuery(option: ChildAccountFilterOption, query: string) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }

  const phoneNorm = normalizePhone(option.phone);
  const queryPhone = normalizePhone(trimmed);

  if (queryPhone && phoneNorm.includes(queryPhone)) {
    return true;
  }

  return option.name.toLowerCase().includes(trimmed);
}

interface ChildAccountFilterComboboxProps {
  options: ChildAccountFilterOption[];
  value: string | null;
  onChange: (childId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChildAccountFilterCombobox({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Lọc theo tài khoản child",
}: ChildAccountFilterComboboxProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(
    () => options.filter((option) => childMatchesQuery(option, text)),
    [options, text],
  );

  const syncTextFromSelection = useCallback(() => {
    if (selected) {
      setText(formatChildLabel(selected));
    } else {
      setText("");
    }
  }, [selected]);

  useEffect(() => {
    if (!open) {
      syncTextFromSelection();
    }
  }, [open, selected, value, syncTextFromSelection]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const choose = (option: ChildAccountFilterOption) => {
    onChange(option.id);
    setText(formatChildLabel(option));
    setOpen(false);
  };

  const clearSelection = () => {
    onChange(null);
    setText("");
    setOpen(false);
  };

  const handleFocus = () => {
    if (disabled) {
      return;
    }
    setOpen(true);
    setText("");
  };

  const handleChangeText = (next: string) => {
    setText(next);
    if (value && (!selected || next.trim() !== formatChildLabel(selected).trim())) {
      onChange(null);
    }
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
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-on-surface-variant">Chưa có tài khoản con.</li>
          ) : filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-on-surface-variant">Không có tài khoản phù hợp.</li>
          ) : (
            filtered.map((option) => (
              <li key={option.id} role="option" aria-selected={option.id === value}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-container-low"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                >
                  <span className="font-medium">{option.name}</span>
                  {option.phone.trim() ? (
                    <span className="ml-2 text-xs text-on-surface-variant">{option.phone.trim()}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
