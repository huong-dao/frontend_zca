import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /**
   * Giữ cột đầu tiên (ô `th`/`td` đầu mỗi dòng) cố định khi cuộn ngang.
   * Đặt `false` hoặc bỏ prop nếu không freeze.
   */
  freezeFirstColumn?: boolean;
};

const SCROLL = "w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain";

/**
 * Gắn vào thẻ `th` khi tự freeze một cột (không dùng `freezeFirstColumn`).
 * Cột thứ 2 trở đi: thêm `left-*` bằng tổng độ rộng các cột bên trái (vd. `left-48`, `left-[200px]`).
 */
export const dataTableFrozenHeaderClass =
  "sticky left-0 z-20 border-r border-outline-variant/15 bg-surface-container-low/50 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)]";

/**
 * Gắn vào thẻ `td` tương ứng; hàng cần có `className="group"` trên `<tr>` để đồng bộ hover.
 */
export const dataTableFrozenCellClass =
  "sticky left-0 z-10 border-r border-outline-variant/10 bg-surface-container-lowest shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] group-hover:bg-surface-container-low/30";

/** Khi `freezeFirstColumn`: style cột đầu qua selector (không cần sửa từng ô). */
const FROZEN_FIRST_COL =
  "[&_thead>tr>th:first-child]:sticky [&_thead>tr>th:first-child]:left-0 [&_thead>tr>th:first-child]:z-20 " +
  "[&_thead>tr>th:first-child]:bg-surface-container-low/50 " +
  "[&_thead>tr>th:first-child]:border-r [&_thead>tr>th:first-child]:border-outline-variant/15 " +
  "[&_thead>tr>th:first-child]:shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] " +
  "[&_tbody>tr>td:first-child:not([colspan])]:sticky " +
  "[&_tbody>tr>td:first-child:not([colspan])]:left-0 " +
  "[&_tbody>tr>td:first-child:not([colspan])]:z-10 " +
  "[&_tbody>tr>td:first-child:not([colspan])]:bg-surface-container-lowest " +
  "[&_tbody>tr>td:first-child:not([colspan])]:border-r " +
  "[&_tbody>tr>td:first-child:not([colspan])]:border-outline-variant/10 " +
  "[&_tbody>tr>td:first-child:not([colspan])]:shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] " +
  "[&_tbody>tr:hover>td:first-child:not([colspan])]:bg-surface-container-low/30";

export function DataTableScroll({ children, className, freezeFirstColumn = false }: Props) {
  const base = [SCROLL, freezeFirstColumn ? FROZEN_FIRST_COL : null, className].filter(Boolean).join(" ");
  return <div className={base}>{children}</div>;
}

/**
 * Dùng trên thẻ `table`: tối thiểu rộng bằng khung, có thể rộng hơn theo nội dung → scroll ngang.
 */
export const dataTableClassName = "w-max min-w-full table-auto border-collapse text-left";
