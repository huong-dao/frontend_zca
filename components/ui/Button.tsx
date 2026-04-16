"use client";

import React, {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "outline"
  | "icon";

type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-container shadow-sm shadow-primary/20",
  secondary:
    "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
  ghost: "text-primary hover:bg-primary/5",
  destructive: "bg-error/10 text-error hover:bg-error/20",
  outline:
    "border border-outline-variant text-on-surface-variant hover:bg-surface-container",
  icon: "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm rounded-lg",
  md: "h-11 px-6 text-sm rounded-xl",
  lg: "h-12 px-7 text-base rounded-xl",
  icon: "h-12 w-12 rounded-xl p-0",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = variant === "icon" ? "icon" : "md",
      loading = false,
      fullWidth = false,
      startIcon,
      endIcon,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const showSpinner = loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
          fullWidth && "w-full",
          variantClasses[variant],
          sizeClasses[size],
          variant === "ghost" && "px-0",
          variant === "icon" && "hover:shadow-xl",
          isDisabled && variant === "primary" && "bg-primary/40 hover:bg-primary/40",
          isDisabled && variant === "secondary" && "hover:bg-surface-container",
          isDisabled && variant === "ghost" && "hover:bg-transparent",
          isDisabled && variant === "destructive" && "hover:bg-error/10",
          Boolean(startIcon) && "gap-2",
          Boolean(endIcon) && "gap-2",
          className,
        )}
        {...props}
      >
        {showSpinner ? (
          <span
            className={cn(
              "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current",
              variant !== "icon" && "mr-2",
            )}
            aria-hidden="true"
          />
        ) : null}

        {!showSpinner && startIcon ? <span className="shrink-0">{startIcon}</span> : null}

        {variant === "icon" ? (
          !showSpinner ? <span className="">{children}</span> : null
        ) : (
          !showSpinner && (
            <span className={cn("inline-flex items-center gap-2")}>{children}</span>
          )
        )}

        {!showSpinner && endIcon ? <span className="shrink-0">{endIcon}</span> : null}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
