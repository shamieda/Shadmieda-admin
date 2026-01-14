"use client";

// Triggering deployment for mobile friendliness improvements
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import clsx from "clsx";
import { Menu } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(true); // Default to collapsed for mobile

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    return (
        <SubscriptionGuard>
            <div className="min-h-screen bg-background flex flex-col lg:flex-row">
                {/* Mobile Header */}
                <header className="lg:hidden h-16 bg-surface border-b border-white/5 flex items-center justify-between px-4 sticky top-0 z-40">
                    <img src="/logo.png" alt="Logo" className="h-8" />
                    <button
                        onClick={toggleSidebar}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </header>

                <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />

                <main className={clsx(
                    "flex-1 p-4 md:p-8 overflow-y-auto h-screen transition-all duration-300",
                    isCollapsed ? "lg:ml-20" : "lg:ml-64"
                )}>
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </SubscriptionGuard>
    );
}
