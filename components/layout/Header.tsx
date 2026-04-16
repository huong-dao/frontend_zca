"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getCurrentZaloSession } from "@/lib/zalo/client";
import { HiBell, HiQuestionMarkCircle, HiMagnifyingGlass, HiUser  } from "react-icons/hi2";

export default function Header() {
    const [zaloUserAvatar, setZaloUserAvatar] = useState<string | undefined>(undefined);
    useEffect(() => {
        async function loadZaloSession() {
            const zaloSession = await getCurrentZaloSession();
            const zaloUserAvatar = zaloSession.session?.user?.avatar;
            if (zaloUserAvatar) {
                setZaloUserAvatar(zaloUserAvatar);
            }
        }

        void loadZaloSession();
    }, []);

    return (
        <header className="flex justify-between items-center h-16 px-8 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-40 shadow-sm shadow-slate-200/50">
            <div className="flex items-center gap-4">
                <div className="relative group">
                    <HiMagnifyingGlass className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input className="placeholder:text-black bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-2 text-sm w-80 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" placeholder="Tìm kiếm..." type="text" />
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <button className="text-slate-500 hover:text-primary transition-all active:opacity-100 opacity-80">
                        <HiBell className="w-5 h-5" />
                    </button>
                    <button className="text-slate-500 hover:text-primary transition-all active:opacity-100 opacity-80">
                        <HiQuestionMarkCircle className="w-5 h-5" />
                    </button>
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-200">
                        {zaloUserAvatar ? (
                            <Image alt="Admin User" className="h-full w-full object-cover" src={zaloUserAvatar} width={32} height={32} unoptimized />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center">
                                <HiUser className="w-5 h-5" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}