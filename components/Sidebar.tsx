"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Clock,
    Users,
    ClipboardList,
    Wallet,
    Settings,
    LogOut,
    User,
    ChevronLeft,
    ChevronRight,
    FileText
} from "lucide-react";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";
import NotificationCenter from "./NotificationCenter";

const managerItems = [
    { name: "Dashboard", href: "/manager", icon: LayoutDashboard },
    { name: "Kehadiran", href: "/manager/attendance", icon: Clock },
    { name: "Staff", href: "/manager/staff", icon: Users },
    { name: "Permohonan", href: "/manager/applications", icon: FileText },
    { name: "Operasi", href: "/manager/operations", icon: ClipboardList },
    { name: "Gaji", href: "/manager/payroll", icon: Wallet },
    { name: "Tetapan", href: "/manager/settings", icon: Settings },
];

const staffItems = [
    { name: "Dashboard", href: "/staff", icon: LayoutDashboard },
    { name: "Rekod Kehadiran", href: "/staff/attendance", icon: Clock },
    { name: "Tugasan", href: "/staff/tasks", icon: ClipboardList },
    { name: "Permohonan", href: "/staff/applications", icon: FileText },
    { name: "Gaji & Advance", href: "/staff/payroll", icon: Wallet },
    { name: "Tetapan", href: "/staff/settings", icon: Settings },
];

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

export function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const isStaff = pathname.startsWith("/staff");
    const [user, setUser] = useState<{ id: string; full_name: string; role: string; avatar_url?: string } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data } = await supabase
                    .from("users")
                    .select("id, full_name, role, avatar_url")
                    .eq("auth_id", authUser.id)
                    .single();
                if (data) {
                    setUser(data);
                }
            }
        };
        fetchUser();
    }, []);

    // Determine menu items based on role
    let menuItems = isStaff ? staffItems : managerItems; // Default based on URL

    if (user) {
        if (user.role === 'staff') {
            menuItems = staffItems;
        } else if (user.role === 'manager' || user.role === 'admin' || user.role === 'master') {
            // Managers, Admins, and Masters get everything including Settings
            menuItems = managerItems;
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <aside className={clsx(
            "bg-surface border-r border-white/5 h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300",
            isCollapsed ? "w-20" : "w-64"
        )}>
            <div className="p-4 border-b border-white/5 flex flex-col items-center text-center relative">
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-6 bg-primary text-black rounded-full p-1 shadow-lg hover:bg-yellow-400 transition-colors z-50"
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                <img src="/logo.png" alt="Shamieda Logo" className={clsx("mb-3 transition-all", isCollapsed ? "w-10" : "w-32")} />
                {!isCollapsed && (
                    <p className="text-xs text-gray-500 mt-1 animate-fade-in">
                        {user ? (
                            user.role === 'admin' || user.role === 'master' ? "Admin Access" :
                                user.role === 'manager' ? "Manager Access" : "Staff Access"
                        ) : (
                            isStaff ? "Staff Access" : "Management Access"
                        )}
                    </p>
                )}
            </div>

            {user && (
                <div className={clsx("border-b border-white/5 flex items-center gap-3 bg-white/5 transition-all", isCollapsed ? "p-2 justify-center" : "px-6 py-4")}>
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 border border-primary/20 overflow-hidden">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xs font-bold uppercase">
                                {user.full_name?.substring(0, 3) || <User className="w-6 h-6" />}
                            </span>
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0 animate-fade-in">
                            <p className="text-sm font-bold text-white truncate">{user.full_name}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{user.role}</p>
                        </div>
                    )}
                    {!isCollapsed && <NotificationCenter />}
                </div>
            )}
            {isCollapsed && user && (
                <div className="flex justify-center py-2 border-b border-white/5">
                    <NotificationCenter />
                </div>
            )}

            <nav className="flex-1 p-2 space-y-2 overflow-y-auto overflow-x-hidden">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={isCollapsed ? item.name : ""}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                                isActive
                                    ? "bg-primary text-black shadow-lg shadow-yellow-500/10"
                                    : "text-gray-400 hover:text-white hover:bg-white/5",
                                isCollapsed && "justify-center px-2"
                            )}
                        >
                            <item.icon className={clsx("w-5 h-5 shrink-0", isActive ? "text-black" : "text-gray-500 group-hover:text-white")} />
                            {!isCollapsed && <span className="truncate">{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/5">
                <button
                    onClick={handleLogout}
                    title={isCollapsed ? "Log Keluar" : ""}
                    className={clsx(
                        "flex items-center gap-3 px-4 py-3 w-full text-left text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium",
                        isCollapsed && "justify-center px-2"
                    )}
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {!isCollapsed && "Log Keluar"}
                </button>
            </div>
        </aside>
    );
}
