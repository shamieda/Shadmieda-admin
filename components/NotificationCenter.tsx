"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Clock, AlertCircle, Info, CheckCircle2, XCircle } from "lucide-react";
import { getNotificationsAction, markAsReadAction, markAllAsReadAction } from "@/app/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { ms } from "date-fns/locale";
import clsx from "clsx";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    useEffect(() => {
        fetchNotifications();

        // Real-time listener
        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                },
                (payload) => {
                    // Only refresh if the notification is for the current user
                    // We don't have the user ID here easily without another fetch or prop
                    // But fetchNotifications already filters by user ID on the server
                    fetchNotifications();
                }
            )
            .subscribe();

        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            supabase.removeChannel(channel);
        };
    }, []);


    const fetchNotifications = async () => {
        console.log("DEBUG: Fetching notifications...");
        const result = await getNotificationsAction();
        console.log("DEBUG: Notifications result:", JSON.stringify(result, null, 2));
        if (result.success) {
            setNotifications(result.notifications || []);
        } else {
            console.error("DEBUG: Fetch failed:", result.error);
        }
        setLoading(false);
    };

    const handleMarkAsRead = async (id: string) => {
        const result = await markAsReadAction(id);
        if (result.success) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        }
    };

    const handleMarkAllAsRead = async () => {
        const result = await markAllAsReadAction();
        if (result.success) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "warning": return <AlertCircle className="w-4 h-4 text-yellow-500" />;
            case "success": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case "error": return <XCircle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-white/5 transition-colors group"
            >
                <Bell className={clsx(
                    "w-5 h-5 transition-colors",
                    unreadCount > 0 ? "text-primary" : "text-gray-400 group-hover:text-white"
                )} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-surface">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-surface border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                        <h3 className="text-sm font-bold text-white">Notifikasi</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={fetchNotifications}
                                className="text-[10px] text-gray-400 hover:text-white font-bold uppercase tracking-wider"
                            >
                                Refresh
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider"
                                >
                                    Tanda semua dibaca
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs text-gray-500">Memuatkan...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 italic">Tiada notifikasi baru.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={clsx(
                                            "p-4 hover:bg-white/5 transition-colors relative group",
                                            !notification.is_read && "bg-primary/5"
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1 flex-shrink-0">
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <p className={clsx(
                                                        "text-xs font-bold truncate",
                                                        notification.is_read ? "text-gray-300" : "text-white"
                                                    )}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ms })}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 line-clamp-2 mb-2">
                                                    {notification.message}
                                                </p>
                                                {notification.link && (
                                                    <Link
                                                        href={notification.link}
                                                        onClick={() => {
                                                            handleMarkAsRead(notification.id);
                                                            setIsOpen(false);
                                                        }}
                                                        className="text-[10px] text-primary hover:underline font-bold uppercase"
                                                    >
                                                        Lihat Butiran
                                                    </Link>
                                                )}
                                            </div>
                                            {!notification.is_read && (
                                                <button
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                                                    title="Tanda sudah baca"
                                                >
                                                    <Check className="w-3 h-3 text-primary" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-white/5 bg-white/5 text-center">
                        <button className="text-[10px] text-gray-500 hover:text-white transition-colors font-bold uppercase tracking-widest">
                            Lihat Semua Aktiviti
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
