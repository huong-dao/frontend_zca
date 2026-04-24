"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HiHome, HiMiniUserCircle, HiMiniUsers, HiMiniUserGroup, HiChatBubbleLeftRight, HiCog, HiKey, HiOutlineArrowRightStartOnRectangle } from "react-icons/hi2";
import { useAdminNav } from "@/contexts/AdminNavContext";
import { useAuth } from "@/contexts/AuthContext";
export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, user } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const { mobileMenuOpen, closeMobileMenu } = useAdminNav();
    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
    const activeClass = 'flex items-center gap-3 text-blue-400 border-l-4 border-blue-600 pl-4 py-3 bg-blue-900/20';
    const inactiveClass = 'flex items-center gap-3 text-slate-300 pl-5 py-3 hover:bg-blue-800/30 hover:text-white transition-colors';

    useEffect(() => {
        closeMobileMenu();
    }, [pathname, closeMobileMenu]);

    async function handleLogout() {
        await logout();
        router.replace("/login");
    }

    return (
        <>
        <div
            aria-hidden={!mobileMenuOpen}
            className={[
                "fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-200 ease-out",
                "lg:hidden",
                mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
            onClick={closeMobileMenu}
        />
        <aside
            className={[
                "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-[#1E3A5F] py-6",
                "transform transition-transform duration-200 ease-out will-change-transform",
                "lg:translate-x-0",
                mobileMenuOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
            ].join(" ")}
        >
            <div className="px-6 mb-8">
                <h1 className="text-lg font-bold text-white tracking-tight">Project ZCA</h1>
                <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mt-1">Automation Hub</p>
            </div>
            <nav className="flex-1 space-y-1 mt-[60px] md:mt-0">
                <Link onClick={closeMobileMenu} className={`${isActive('/dashboard') ? activeClass : inactiveClass}`} href="/dashboard">
                    <HiHome className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Dashboard</span>
                </Link>
                {isAdmin ? (
                    <Link onClick={closeMobileMenu} className={`${isActive('/users') ? activeClass : inactiveClass}`} href="/users">
                        <HiMiniUserCircle className="w-5 h-5" />
                        <span className="font-inter body-md tracking-normal">Người dùng</span>
                    </Link>
                ) : null}
                <Link onClick={closeMobileMenu} className={`${isActive('/zalo-groups') ? activeClass : inactiveClass}`} href="/zalo-groups">
                    <HiMiniUserGroup className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Nhóm Zalo</span>
                </Link>
                <Link onClick={closeMobileMenu} className={`${isActive('/zalo-accounts') ? activeClass : inactiveClass}`} href="/zalo-accounts">
                    <HiMiniUsers className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Tài khoản Zalo</span>
                </Link>
                <Link onClick={closeMobileMenu} className={`${isActive('/messages') ? activeClass : inactiveClass}`} href="/messages">
                    <HiChatBubbleLeftRight className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Tin nhắn</span>
                </Link>
                <Link onClick={closeMobileMenu} className={`${isActive('/configs') ? activeClass : inactiveClass}`} href="/configs">
                    <HiCog className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Cấu hình</span>
                </Link>
                <Link onClick={closeMobileMenu} className={`${isActive('/api-keys') ? activeClass : inactiveClass}`} href="/api-keys">
                    <HiKey className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">API Keys</span>
                </Link>
                <div className="mt-auto border-t border-white/20"></div>
                <button className="flex w-full items-center gap-3 pl-5 py-3 text-left text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-400" onClick={() => { void handleLogout(); closeMobileMenu(); }} type="button">
                    <HiOutlineArrowRightStartOnRectangle className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Đăng xuất</span>
                </button>
            </nav>
        </aside>
        </>
    );
}