"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { HiChevronDown, HiMagnifyingGlass } from "react-icons/hi2";
import type { ZaloSessionPublic } from "@/lib/zalo/types";

function formatSessionLabel(session: ZaloSessionPublic) {
  const name = session.user.displayName?.trim() || session.user.uid;
  const phone = session.user.phoneNumber?.trim();
  return phone ? `${name} · ${phone}` : name;
}

function normalizePhone(s: string) {
  return s.replace(/\D/g, "");
}

function sessionMatchesQuery(session: ZaloSessionPublic, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const u = session.user;
  const phoneNorm = normalizePhone(u.phoneNumber || "");
  const qPhone = normalizePhone(q);
  const parts = [u.displayName, u.zaloName, u.username, u.uid, u.phoneNumber].map((p) => (p || "").toLowerCase());
  if (qPhone && phoneNorm.includes(qPhone)) {
    return true;
  }
  return parts.some((p) => p.includes(q));
}

interface ZaloSessionComboboxProps {
  sessions: ZaloSessionPublic[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  disabled?: boolean;
  switching?: boolean;
}

export default function ZaloSessionCombobox({
  sessions,
  activeSessionId,
  onSelectSession,
  disabled = false,
  switching = false,
}: ZaloSessionComboboxProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const selected =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null;

  const filtered = useMemo(() => sessions.filter((session) => sessionMatchesQuery(session, text)), [sessions, text]);

  const syncTextFromSelection = useCallback(() => {
    if (selected) {
      setText(formatSessionLabel(selected));
    } else {
      setText("");
    }
  }, [selected]);

  useEffect(() => {
    if (!open) {
      syncTextFromSelection();
    }
  }, [open, selected, activeSessionId, syncTextFromSelection]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const choose = (session: ZaloSessionPublic) => {
    onSelectSession(session.id);
    setText(formatSessionLabel(session));
    setOpen(false);
  };

  const busy = disabled || switching;

  return (
    <div ref={containerRef} className="relative min-w-0 w-full max-w-[min(100%,320px)]">
      <div
        className={`flex w-full items-center gap-2 rounded-lg border border-outline-variant/20 bg-white px-2 py-1.5 text-xs shadow-sm focus-within:border-[#004ac6] focus-within:ring-1 focus-within:ring-[#004ac6]/30 dark:border-slate-700 dark:bg-slate-900 ${
          busy ? "opacity-70" : ""
        }`}
      >
        <HiMagnifyingGlass className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
        <input
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label="Tìm hoặc chọn phiên Zalo"
          disabled={busy}
          placeholder="Tìm tên, SĐT…"
          className="min-w-0 flex-1 bg-transparent text-xs text-on-surface outline-none placeholder:text-slate-400 dark:text-slate-100"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => {
            if (!busy) {
              setOpen(true);
              setText("");
            }
          }}
        />
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800"
          tabIndex={-1}
          aria-label="Mở danh sách phiên"
          disabled={busy}
          onClick={() => {
            if (!busy) {
              setOpen((previous) => {
                const next = !previous;
                if (next) {
                  setText("");
                }
                return next;
              });
            }
          }}
        >
          <HiChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {open && !busy ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[100] mt-1 max-h-64 w-full overflow-auto rounded-lg border border-outline-variant/20 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500">Không có phiên phù hợp.</li>
          ) : (
            filtered.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <li key={session.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 px-2 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      isActive ? "bg-slate-50 dark:bg-slate-800/80" : ""
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(session)}
                  >
                    {session.user.avatar ? (
                      <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-200">
                        <Image
                          alt=""
                          className="h-full w-full object-cover"
                          src={session.user.avatar}
                          width={28}
                          height={28}
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="h-7 w-7 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                        {session.user.displayName || session.user.uid}
                        {isActive ? (
                          <span className="ml-1.5 text-[10px] font-normal text-[#004ac6]">(đang chọn)</span>
                        ) : null}
                      </p>
                      {session.user.phoneNumber ? (
                        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                          {session.user.phoneNumber}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
