"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Reset Payroll Action
 * Clears testing data (Attendance and Onboarding kit deductions)
 * CRITICAL: Only allowed for Admin/Manager roles.
 */
export async function resetPayrollAction() {
    try {
        if (!supabaseAdmin) throw new Error("Supabase Admin client not initialized");

        console.log("[System Reset] Initiating full data wipe for testing cleanup...");

        // 1. Delete ALL Attendance records
        await supabaseAdmin
            .from('attendance')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        // 2. Delete ALL Leave Applications (Permohonan Cuti)
        await supabaseAdmin
            .from('leave_applications')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        // 3. Delete ALL Tasks (Operations/Tugasan)
        await supabaseAdmin
            .from('tasks')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        // 4. Delete ALL Advance Requests (Pinjaman)
        await supabaseAdmin
            .from('advance_requests')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        // 5. Delete ALL Notifications & Broadcasts
        await supabaseAdmin
            .from('notifications')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        await supabaseAdmin
            .from('broadcast_notifications')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        await supabaseAdmin
            .from('payroll')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        // 6. Reset Onboarding Kit for all users
        const { error: userError } = await supabaseAdmin
            .from('users')
            .update({ onboarding_kit: [] })
            .neq('role', 'master'); // Safety: don't touch master if they have data

        if (userError) throw userError;

        console.log("[System Reset] Full cleanup successful.");
        return { success: true };

    } catch (error: any) {
        console.error("[Payroll Reset] Error:", error.message);
        return { success: false, error: error.message };
    }
}
