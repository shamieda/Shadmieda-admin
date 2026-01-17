"use server";

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { calculatePenalty, normalizeStatus } from "@/lib/attendance-utils";

interface CreateAttendanceResult {
    success: boolean;
    message?: string;
    error?: string;
}


export async function createManualAttendanceAction(
    userId: string,
    clockInTime: string, // ISO String
    overrideStatus?: string,
    selfieUrl?: string
): Promise<CreateAttendanceResult> {
    try {
        const supabase = await createClient();

        // 1. Verify Permission
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("Pengesahan gagal.");

        const { data: currentUser } = await supabase
            .from('users')
            .select('role')
            .eq('auth_id', user.id)
            .single();

        if (!currentUser || !['admin', 'manager', 'master', 'supervisor'].includes(currentUser.role)) {
            throw new Error("Tiada kebenaran untuk mencipta rekod kehadiran.");
        }

        // 2. Check for Duplicate Attendance (Same Day)
        const clockInDate = new Date(clockInTime);
        const startOfDay = new Date(clockInDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(clockInDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: existing } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', userId)
            .gte('clock_in', startOfDay.toISOString())
            .lte('clock_in', endOfDay.toISOString())
            .single();

        if (existing) {
            return { success: false, error: "Staff ini sudah mempunyai rekod kehadiran untuk tarikh tersebut." };
        }

        // 3. Get Shop Settings for Penalty - Use Admin for reliability
        const { data: shopData, error: settingsError } = await (supabaseAdmin || supabase)
            .from('shop_settings')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (settingsError) {
            console.error("Error fetching shop settings:", settingsError);
        }

        // Fallback to defaults only if no settings exist in DB
        const shopSettings = shopData || {
            start_time: '09:00:00',
            late_penalty_per_minute: 0,
            penalty_15m: 0,
            penalty_30m: 0,
            penalty_max: 0
        };

        if (!shopData) {
            console.warn("⚠️ Shop settings NOT FOUND in DB. Using fallbacks (RM0 penalties).");
        }

        // 4. Calculate Penalty using centralized utility
        const { status: calculatedStatus, penalty } = calculatePenalty(clockInDate, shopSettings);

        // Normalize status using centralized utility
        const finalStatus = normalizeStatus(overrideStatus || calculatedStatus);

        // 5. Insert Record
        const { error: insertError } = await supabase
            .from('attendance')
            .insert({
                user_id: userId,
                clock_in: clockInDate.toISOString(),
                status: finalStatus,
                penalty_amount: penalty,
                location_lat: null, // Manual entry
                location_long: null,
                selfie_url: selfieUrl || null
            });

        if (insertError) throw insertError;

        revalidatePath('/staff/manage-attendance');
        revalidatePath('/manager/attendance');

        return { success: true, message: `Kehadiran berjaya direkodkan. (${finalStatus}, RM${penalty})` };

    } catch (error: any) {
        console.error("Manual Attendance Error:", error);
        return { success: false, error: error.message };
    }
}
