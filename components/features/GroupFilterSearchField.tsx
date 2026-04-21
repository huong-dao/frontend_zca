"use client";

import { HiMagnifyingGlass } from "react-icons/hi2";

interface GroupFilterSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Ô tìm kiếm cùng style với GroupSearchCombobox (chỉ lọc, không chọn bản ghi). */
export default function GroupFilterSearchField({
  value,
  onChange,
  disabled = false,
  placeholder = "Lọc theo tên nhóm…",
}: GroupFilterSearchFieldProps) {
  return (
    <div
      className={`flex w-full items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <HiMagnifyingGlass className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
      <input
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        disabled={disabled}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/70"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
