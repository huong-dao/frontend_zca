"use client";

import React from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info";

type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  dot?: boolean; // có chấm tròn bên trái
  icon?: React.ReactNode;
}

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-surface-container text-on-surface-variant",
  success:
    "bg-green-500/10 text-green-600 border border-green-500/20",
  error:
    "bg-red-500/10 text-red-600 border border-red-500/20",
  warning:
    "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20",
  info:
    "bg-blue-500/10 text-blue-600 border border-blue-500/20",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "text-xs px-2 py-0.5 rounded-md",
  md: "text-sm px-2.5 py-1 rounded-lg",
  lg: "text-sm px-3 py-1.5 rounded-xl",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-gray-400",
  success: "bg-green-500",
  error: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-blue-500",
};

export default function Badge({
  variant = "default",
  size = "md",
  children,
  className,
  dot = false,
  icon = null,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium",
        "whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "mr-1.5 inline-block h-2 w-2 rounded-full",
            dotColors[variant]
          )}
        />
      )}

      {icon !== null ? (
        <span className="mr-1.5">{icon}</span>
      ) : null}

      {children}
    </span>
  );
}