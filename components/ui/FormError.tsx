"use client";

import React from "react";
import { HiExclamationCircle } from "react-icons/hi2";

export interface FormErrorProps {
  message?: string;
  className?: string;
}

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export default function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;

  return (
    <p
      className={cn(
        "mt-1 flex items-start gap-1.5 text-sm text-red-600",
        className
      )}
    >
      <HiExclamationCircle className="mt-[2px] h-4 w-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}