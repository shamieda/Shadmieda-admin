"use server";

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

interface CreateAttendanceResult {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Calculate penalty based on clock-in time and shop settings
 * (Duplicated helper to ensure standalone consistency)
 */
function calculatePenalty(clockInTime: Date, shopSettings: any) {
    const [startH, startM, startS] = shopSettings.start_time.split(':').map(Number);
    const startTimeDate = new Date(clockInTime);
    startTimeDate.setHours(startH, startM, startS || 0, 0);

    if (clockInTime <= startTimeDate) {
        return { status: 'present', penalty: 0 };
    }

    const diffMs = clockInTime.getTime() - startTimeDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    let penalty = 0;

    if (shopSettings.penalty_max > 0 && diffMins > 30) {
        penalty = shopSettings.penalty_max;
    } else if (shopSettings.penalty_30m > 0 && diffMins > 15) {
        penalty = shopSettings.penalty_30m;
    } else if (shopSettings.penalty_15m > 0 && diffMins > 0) {
        penalty = shopSettings.penalty_15m;
    } else {
        penalty = diffMins * (shopSettings.late_penalty_per_minute || 0);
    }

    return { status: 'late', penalty };
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

        // 4. Calculate Penalty
        const { status: calculatedStatus, penalty } = calculatePenalty(clockInDate, shopSettings);

        // Normalize status to ensure database constraint compliance ('present', 'late', 'absent')
        const normalizeStatus = (status: string) => {
            const lower = status.toLowerCase();
            if (lower === 'late' || lower === 'lewat') return 'late';
            if (lower === 'present' || lower === 'hadir') return 'present';
            if (lower === 'absent' || lower === 'ponteng') return 'absent';
            return lower;
        };

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
