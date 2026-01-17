"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Clock, ClipboardList, Wallet, Settings, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const MENU_ITEMS = [
    { name: "Kehadiran", href: "/manager/attendance", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10", desc: "Pantau masa masuk/keluar staff." },
    { name: "Pengurusan Staff", href: "/manager/staff", icon: Users, color: "text-green-400", bg: "bg-green-500/10", desc: "Daftar staff baru & rekod." },
    { name: "Operasi Lantai", href: "/manager/operations", icon: ClipboardList, color: "text-yellow-400", bg: "bg-yellow-500/10", desc: "Monitor status tugasan harian." },
    { name: "Gaji & Bonus", href: "/manager/payroll", icon: Wallet, color: "text-purple-400", bg: "bg-purple-500/10", desc: "Kira gaji & hantar slip WhatsApp." },
    { name: "Tetapan", href: "/manager/settings", icon: Settings, color: "text-gray-400", bg: "bg-gray-500/10", desc: "Konfigurasi sistem." },
];

export default function ManagerDashboard() {
    const [stats, setStats] = useState({
        staffCount: 0,
        activeStaff: 0,
        lateCount: 0,
        taskCompletion: 0
    });
    const [userName, setUserName] = useState("");
    const [userRole, setUserRole] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // 1. Get current user profile
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('full_name, role')
                    .eq('auth_id', user.id)
                    .single();
                if (profile) {
                    setUserName(profile.full_name);
                    setUserRole(profile.role);
                }
            }

            // 2. Get total staff count
            const { count: staffCount, error: countError } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .in('role', ['staff', 'supervisor']);

            if (countError) console.error("Staff count error:", countError);
            console.log("Staff count result:", staffCount);

            // 3. Get today's attendance
            const today = new Date().toISOString().split('T')[0];
            const { data: attendance } = await supabase
                .from('attendance')
                .select('*')
                .gte('clock_in', `${today}T00:00:00`)
                .lte('clock_in', `${today}T23:59:59`);

            const activeStaff = attendance?.length || 0;
            const lateCount = attendance?.filter((a: any) => a.status === 'late').length || 0;

            // 4. Get today's tasks
            const { data: tasks } = await supabase
                .from('tasks')
                .select('*')
                .gte('created_at', `${today}T00:00:00`);

            const totalTasks = tasks?.length || 0;
            const completedTasks = tasks?.filter((t: any) => t.is_completed).length || 0;
            const taskCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            setStats({
                staffCount: staffCount || 0,
                activeStaff,
                lateCount,
                taskCompletion
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const todayDate = new Date().toLocaleDateString('ms-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">
                        {userRole === 'admin' ? 'Admin Dashboard' : 'Manager Dashboard'}
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base">Selamat datang, {userName || 'Manager'}.</p>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto p-3 sm:p-0 bg-white/5 sm:bg-transparent rounded-xl border border-white/5 sm:border-0">
                    <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold tracking-wider">Tarikh Hari Ini</p>
                    <p className="text-white font-bold">{todayDate}</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface border border-white/5 p-6 rounded-2xl">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Staff Bertugas</h3>
                    {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                        <p className="text-3xl font-bold text-white">{stats.activeStaff} <span className="text-sm text-gray-500 font-normal">/ {stats.staffCount}</span></p>
                    )}
                </div>
                <div className="bg-surface border border-white/5 p-6 rounded-2xl">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Lewat Hari Ini</h3>
                    {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                        <p className="text-3xl font-bold text-red-400">{stats.lateCount} <span className="text-sm text-gray-500 font-normal">Staff</span></p>
                    )}
                </div>
                <div className="bg-surface border border-white/5 p-6 rounded-2xl">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Tugasan Selesai</h3>
                    {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                        <p className="text-3xl font-bold text-green-400">{stats.taskCompletion}%</p>
                    )}
                </div>
            </div>

            {/* Menu Grid */}
            <h2 className="text-xl font-bold text-white mt-8 mb-4">Menu Utama</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MENU_ITEMS.map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className="bg-surface border border-white/5 p-6 rounded-2xl hover:border-primary/30 hover:bg-white/5 transition-all group"
                    >
                        <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            <item.icon className={`w-6 h-6 ${item.color}`} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
