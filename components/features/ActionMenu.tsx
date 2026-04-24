"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

const MENU_W_PX = 224; // w-56
const GAP_PX = 4;

interface ActionMenuProps {
  items: ActionItem[];
}

export default function ActionMenu({ items }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) {
      return;
    }
    const rect = btn.getBoundingClientRect();
    let left = rect.right - MENU_W_PX;
    const margin = 8;
    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - MENU_W_PX - margin),
    );
    setCoords({ top: rect.bottom + GAP_PX, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    updatePosition();
  }, [open, updatePosition, items.length]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onReposition = () => updatePosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, updatePosition]);

  // Đóng khi bấm ra ngoài (kể cả khi menu render qua portal)
  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const menu =
    open && typeof document !== "undefined" ? (
      <div
        className="fixed w-56 max-h-[min(60vh,24rem)] overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-lg z-[1000]"
        ref={menuRef}
        style={{ top: coords.top, left: coords.left }}
        role="menu"
      >
        <div className="py-1">
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-surface-container ${
                item.danger
                  ? "text-error hover:text-error"
                  : "text-on-surface"
              }`}
            >
              {item.icon != null ? (
                <span className="text-lg">{item.icon}</span>
              ) : null}
              {item.label}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="relative inline-block text-left" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-md px-3 text-2xl text-on-surface-variant transition-colors hover:bg-surface-container"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        ⋮
      </button>

      {menu != null
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
