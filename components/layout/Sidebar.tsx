"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { HiHome, HiMiniUserCircle, HiMiniUsers, HiMiniUserGroup, HiChatBubbleLeftRight, HiCog, HiKey, HiOutlineArrowRightStartOnRectangle } from "react-icons/hi2";
import { useAuth } from "@/contexts/AuthContext";
export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuth();
    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
    const activeClass = 'flex items-center gap-3 text-blue-400 border-l-4 border-blue-600 pl-4 py-3 bg-blue-900/20';
    const inactiveClass = 'flex items-center gap-3 text-slate-300 pl-5 py-3 hover:bg-blue-800/30 hover:text-white transition-colors';

    async function handleLogout() {
        await logout();
        router.replace("/login");
    }

    return (
        <aside className="h-screen w-64 fixed left-0 top-0 bg-[#1E3A5F] flex flex-col py-6 z-50">
            <div className="px-6 mb-8">
                <h1 className="text-lg font-bold text-white tracking-tight">Project ZCA</h1>
                <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mt-1">Automation Hub</p>
            </div>
            <nav className="flex-1 space-y-1">
                <Link className={`${isActive('/dashboard') ? activeClass : inactiveClass}`} href="/dashboard">
                    <HiHome className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Dashboard</span>
                </Link>
                <Link className={`${isActive('/users') ? activeClass : inactiveClass}`} href="/users">
                    <HiMiniUserCircle className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Người dùng</span>
                </Link>
                <Link className={`${isActive('/zalo-groups') ? activeClass : inactiveClass}`} href="/zalo-groups">
                    <HiMiniUserGroup className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Nhóm Zalo</span>
                </Link>
                <Link className={`${isActive('/zalo-accounts') ? activeClass : inactiveClass}`} href="/zalo-accounts">
                    <HiMiniUsers className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Tài khoản Zalo</span>
                </Link>
                <Link className={`${isActive('/messages') ? activeClass : inactiveClass}`} href="/messages">
                    <HiChatBubbleLeftRight className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Tin nhắn</span>
                </Link>
                <Link className={`${isActive('/configs') ? activeClass : inactiveClass}`} href="/configs">
                    <HiCog className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Cấu hình</span>
                </Link>
                <Link className={`${isActive('/api-keys') ? activeClass : inactiveClass}`} href="/api-keys">
                    <HiKey className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">API Keys</span>
                </Link>
                <div className="mt-auto border-t border-white/20"></div>
                <button className="flex w-full items-center gap-3 pl-5 py-3 text-left text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-400" onClick={handleLogout} type="button">
                    <HiOutlineArrowRightStartOnRectangle className="w-5 h-5" />
                    <span className="font-inter body-md tracking-normal">Đăng xuất</span>
                </button>
            </nav>
        </aside>
    );
}