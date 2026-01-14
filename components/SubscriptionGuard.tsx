"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

// Mock Subscription Status
// Toggle this to 'inactive' to test the Kill-Switch
const SUBSCRIPTION_STATUS: 'active' | 'inactive' = 'active';

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSubscription();
    }, [pathname]);

    const checkSubscription = async () => {
        // In a real app, fetch from Supabase 'subscriptions' table
        // const { data } = await supabase.from('subscriptions').select('status').single();

        const status = SUBSCRIPTION_STATUS;

        if (status === 'inactive' && pathname !== '/locked') {
            router.push('/locked');
        } else if (status === 'active' && pathname === '/locked') {
            router.push('/manager'); // Or previous page
        }

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
