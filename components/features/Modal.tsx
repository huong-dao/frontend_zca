"use client";

import React from "react";
import { HiXMark } from "react-icons/hi2";

interface ModalProps {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit?: () => void;
  loading?: boolean;
  buttonText?: string;
  cancelText?: string;
}

export default function Modal({
  open,
  title,
  children,
  onClose,
  onSubmit,
  loading = false,
  buttonText = "",
  cancelText = "Hủy",
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-[2px]">
      <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-[0_8px_30px_rgba(25,28,30,0.12)] overflow-hidden">
        
        {/* Header */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-on-surface">
              {title}
            </h3>

            <button
              onClick={onClose}
              className="text-outline hover:text-on-surface transition-colors p-1"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4">{children}</div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 bg-surface-container-low/50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-colors"
          >
            {cancelText}
          </button>

          {buttonText !== "" ? (
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-6 py-2 text-sm font-semibold text-white bg-gradient-to-br from-primary to-primary-container rounded-lg shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
              {loading ? "Đang lưu..." : buttonText}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}