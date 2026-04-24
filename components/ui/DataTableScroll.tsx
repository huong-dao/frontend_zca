import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

const SCROLL = "w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain";

/**
 * Bọc bảng để chỉ vùng bảng cuộn ngang khi nhiều cột / nội dung dài.
 * Kết hợp với `className={dataTableClassName}` trên thẻ table.
 */
export function DataTableScroll({ children, className }: Props) {
  return <div className={className ? `${SCROLL} ${className}`.trim() : SCROLL}>{children}</div>;
}

/** Dùng trên thẻ table: tối thiểu rộng bằng khung, có thể rộng hơn theo nội dung → scroll ngang. */
export const dataTableClassName = "w-max min-w-full table-auto border-collapse text-left";
