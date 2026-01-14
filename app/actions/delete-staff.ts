"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function deleteStaffAction(staffId: string, authId?: string) {
    try {
        if (!supabaseAdmin) {
            return { success: false, error: "Supabase Admin client is not initialized." };
        }

        // 1. Manually delete related records first to avoid FK violations
        console.log(`Deleting related records for staff ${staffId}...`);
        await supabaseAdmin.from('attendance').delete().eq('user_id', staffId);
        await supabaseAdmin.from('tasks').delete().eq('assigned_to', staffId);
        await supabaseAdmin.from('payroll').delete().eq('user_id', staffId);

        // 2. Delete from public.users
        console.log(`Deleting from public.users where id = ${staffId}...`);
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', staffId);

        if (dbError) throw dbError;

        // 3. Delete from Supabase Auth if authId is provided
        if (authId) {
            console.log(`Deleting from Supabase Auth where id = ${authId}...`);
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authId);
            if (authError) {
                console.error('Error deleting auth user:', authError);
            }
        } else {
            console.log("No authId provided, skipping Auth deletion.");
        }

        return { success: true };
    } catch (error: any) {
        console.error('Delete Staff Error:', error);
        return { success: false, error: error.message };
    }
}
