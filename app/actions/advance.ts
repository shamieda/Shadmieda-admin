"use server";

import { createClient } from "@/lib/supabase-server";
import { createNotificationAction, getManagersAction } from "./notifications";
import { revalidatePath } from "next/cache";

export async function requestAdvanceAction(amount: number, reason?: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: "Unauthorized" };

        // 1. Get Profile
        const { data: profile } = await supabase
            .from('users')
            .select('id, full_name')
            .eq('auth_id', user.id)
            .single();

        if (!profile) return { success: false, error: "Profile not found" };

        // 2. Insert Request
        const { data, error } = await supabase
            .from('advance_requests')
            .insert({
                user_id: profile.id,
                amount,
                reason,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        // 3. Notify Managers
        const managersResult = await getManagersAction();
        if (managersResult.success && managersResult.managers) {
            for (const manager of managersResult.managers) {
                await createNotificationAction({
                    userId: manager.id,
                    title: "Permohonan Advance Baru",
                    message: `${profile.full_name} memohon advance sebanyak RM${amount.toFixed(2)}.`,
                    type: "info",
                    category: "advance",
                    link: "/manager/payroll" // Or a specific advance management page
                });
            }
        }

        revalidatePath("/staff/payroll");
        return { success: true, data };
    } catch (error: any) {
        console.error("Error requesting advance:", error);
        return { success: false, error: error.message };
    }
}
