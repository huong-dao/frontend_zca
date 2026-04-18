"use client";

import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

type PaginationItem = number | "...";

function buildPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className,
}: PaginationProps) {
  const normalizedTotalPages = Math.max(totalPages, 1);
  const normalizedCurrentPage = Math.min(Math.max(currentPage, 1), normalizedTotalPages);
  const items = buildPaginationItems(normalizedCurrentPage, normalizedTotalPages);
  const canGoPrevious = normalizedCurrentPage > 1 && !disabled;
  const canGoNext = normalizedCurrentPage < normalizedTotalPages && !disabled;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <button
        type="button"
        aria-label="Trang trước"
        onClick={() => onPageChange(normalizedCurrentPage - 1)}
        disabled={!canGoPrevious}
        className={cn(
          "inline-flex h-7 w-9 items-center justify-center rounded-lg border border-outline-variant",
          "bg-surface-container-lowest px-3 text-xs font-medium text-on-surface transition-colors",
          "hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <HiChevronLeft className="h-4 w-4" />
      </button>

      {items.map((item, index) =>
        item === "..." ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex h-9 min-w-9 items-center justify-center text-xs text-on-surface-variant"
          >
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`Trang ${item}`}
            aria-current={item === normalizedCurrentPage ? "page" : undefined}
            onClick={() => onPageChange(item)}
            disabled={disabled}
            className={cn(
              "inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-3 text-xs font-medium transition-colors",
              "border border-outline-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50",
              item === normalizedCurrentPage
                ? "bg-primary text-white border-primary hover:text-primary hover:bg-primary"
                : "bg-surface-container-lowest text-on-surface",
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Trang sau"
        onClick={() => onPageChange(normalizedCurrentPage + 1)}
        disabled={!canGoNext}
        className={cn(
          "inline-flex h-7 w-9 items-center justify-center rounded-lg border border-outline-variant",
          "bg-surface-container-lowest px-3 text-xs font-medium text-on-surface transition-colors",
          "hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <HiChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
