"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type AdminNavContextValue = {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
};

const AdminNavContext = createContext<AdminNavContextValue | undefined>(undefined);

export function AdminNavProvider({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((o) => !o);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) {
        setMobileMenuOpen(false);
      }
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }
    const { overflow, paddingRight } = document.body.style;
    const w = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (w > 0) {
      document.body.style.paddingRight = `${w}px`;
    }
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [mobileMenuOpen]);

  const value: AdminNavContextValue = {
    mobileMenuOpen,
    setMobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
  };

  return <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>;
}

export function useAdminNav() {
  const ctx = useContext(AdminNavContext);
  if (ctx == null) {
    throw new Error("useAdminNav must be used within AdminNavProvider");
  }
  return ctx;
}
