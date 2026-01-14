"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import clsx from "clsx";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    return (
        <SubscriptionGuard>
            <div className="min-h-screen bg-background flex">
                <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
                <main className={clsx(
                    "flex-1 p-8 overflow-y-auto h-screen transition-all duration-300",
                    isCollapsed ? "ml-20" : "ml-64"
                )}>
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </SubscriptionGuard>
    );
}
