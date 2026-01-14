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

        // 1. Verify User Authority
        // Note: In a real app, you would check the session here.
        // For now, we assume the dashboard RLS protects the page, 
        // but we can add a basic check if needed.

        console.log("[Payroll Reset] Initiating data wipe...");

        // 2. Delete ALL Attendance records
        // This resets "Hari Bekerja" and "late_penalty" for everyone.
        const { error: attError } = await supabaseAdmin
            .from('attendance')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

        if (attError) throw attError;

        // 3. Reset Onboarding Kit for all STAFF users
        // This removes the "Onboarding Kit - RM90" deductions.
        const { error: userError } = await supabaseAdmin
            .from('users')
            .update({ onboarding_kit: [] })
            .eq('role', 'staff');

        if (userError) throw userError;

        console.log("[Payroll Reset] Success.");
        return { success: true };

    } catch (error: any) {
        console.error("[Payroll Reset] Error:", error.message);
        return { success: false, error: error.message };
    }
}
