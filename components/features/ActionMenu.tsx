"use client";

import { useState, useRef, useEffect } from "react";

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  items: ActionItem[];
}

export default function ActionMenu({ items }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // click outside để đóng
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      {/* button ⋮ */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="px-3 text-2xl rounded-md hover:bg-gray-100"
      >
        ⋮
      </button>

      {/* dropdown */}
      {open && (
        <div className="absolute right-0 w-56 rounded-xl border bg-white shadow-lg z-50">
          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-gray-100 ${
                  item.danger ? "text-red-600" : "text-gray-700"
                }`}
              >
                {item.icon && (
                  <span className="text-lg">{item.icon}</span>
                )}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}