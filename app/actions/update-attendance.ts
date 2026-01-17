"use server";

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { awardGoodDeedAction, deductBadDeedAction } from "./points";

interface ShopSettings {
    start_time: string;
    penalty_15m: number;
    penalty_30m: number;
    penalty_max: number;
    late_penalty_per_minute: number;
}

interface UpdateAttendanceResult {
    success: boolean;
    message?: string;
    error?: string;
    updatedRecord?: any;
}

/**
 * Calculate penalty based on clock-in time and shop settings
 */
function calculatePenaltyFromTime(
    clockInTime: Date,
    shopSettings: ShopSettings
): { status: string; penalty: number } {
    const [startH, startM, startS] = shopSettings.start_time.split(':').map(Number);
    const startTimeDate = new Date(clockInTime);
    startTimeDate.setHours(startH, startM, startS || 0, 0);

    // If clocked in before or at start time, no penalty
    if (clockInTime <= startTimeDate) {
        return { status: 'present', penalty: 0 };
    }

    // Calculate how late in minutes
    const diffMs = clockInTime.getTime() - startTimeDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    let penalty = 0;
    const status = 'late';

    // Tiered Penalty Logic (matching staff attendance page logic)
    if (shopSettings.penalty_max > 0 && diffMins > 30) {
        penalty = shopSettings.penalty_max;
    } else if (shopSettings.penalty_30m > 0 && diffMins > 15) {
        penalty = shopSettings.penalty_30m;
    } else if (shopSettings.penalty_15m > 0 && diffMins > 0) {
        penalty = shopSettings.penalty_15m;
    } else {
        // Fallback to per-minute
        penalty = diffMins * (shopSettings.late_penalty_per_minute || 0);
    }

    return { status, penalty };
}

/**
 * Normalize status values to ensure database constraint compliance ('present', 'late', 'absent')
 */
const normalizeStatus = (status: string) => {
    const lower = status.toLowerCase();
    if (lower === 'late' || lower === 'lewat') return 'late';
    if (lower === 'present' || lower === 'hadir') return 'present';
    if (lower === 'absent' || lower === 'ponteng') return 'absent';
    return lower;
};

/**
 * Adjust monthly points based on status change
 */
async function adjustPointsForStatusChange(
    userId: string,
    oldStatus: string,
    newStatus: string,
    month: string
): Promise<void> {
    const oldNormalized = normalizeStatus(oldStatus);
    const newNormalized = normalizeStatus(newStatus);

    // No change in status
    if (oldNormalized === newNormalized) {
        return;
    }

    // Late → Present: Award +1 point (reverse the bad deed)
    if (oldNormalized === 'late' && newNormalized === 'present') {
        await awardGoodDeedAction(userId, month);
        console.log(`✅ Awarded +1 point to user ${userId} (Late → Present)`);
    }

    // Present → Late: Deduct -1 point (add a bad deed)
    if (oldNormalized === 'present' && newNormalized === 'late') {
        await deductBadDeedAction(userId, month);
        console.log(`❌ Deducted -1 point from user ${userId} (Present → Late)`);
    }
}

/**
 * Main action to update attendance record with business logic
 */
export async function updateAttendanceAction(
    attendanceId: string,
    newClockIn: string,
    newStatus: string
): Promise<UpdateAttendanceResult> {
    try {
        // Create server-side Supabase client
        const supabase = await createClient();

        // 1. Verify user has manager permissions
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, error: "Ralat pengesahan. Sila log masuk semula." };
        }

        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('auth_id', user.id)
            .single();

        if (!profile || !['admin', 'manager', 'master', 'supervisor'].includes(profile.role)) {
            return { success: false, error: "Anda tidak mempunyai kebenaran untuk mengubah rekod kehadiran." };
        }

        // 2. Get existing attendance record
        const { data: existingRecord, error: fetchError } = await supabase
            .from('attendance')
            .select('*, users:user_id(id, full_name)')
            .eq('id', attendanceId)
            .single();

        if (fetchError || !existingRecord) {
            return { success: false, error: "Rekod kehadiran tidak dijumpai." };
        }

        // 3. Get shop settings for penalty calculation - Use Admin for reliability
        const { data: shopData, error: settingsError } = await (supabaseAdmin || supabase)
            .from('shop_settings')
            .select('start_time, late_penalty_per_minute, penalty_15m, penalty_30m, penalty_max')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (settingsError) {
            console.error("Error fetching shop settings in update:", settingsError);
        }

        // Fallback to defaults if no settings exist
        const shopSettings = shopData || {
            start_time: '09:00:00',
            late_penalty_per_minute: 0,
            penalty_15m: 0,
            penalty_30m: 0,
            penalty_max: 0
        };

        if (!shopData) {
            console.warn("⚠️ Shop settings NOT FOUND in DB during update. Using fallbacks.");
        }

        // 4. Calculate new penalty based on new clock-in time
        const newClockInDate = new Date(newClockIn);
        const { status: calculatedStatus, penalty: calculatedPenalty } = calculatePenaltyFromTime(
            newClockInDate,
            shopSettings
        );

        // 5. Determine final status (use manual override if provided, otherwise use calculated)
        // Normalize status to ensure database constraint compliance ('present', 'late', 'absent')
        const finalStatus = normalizeStatus(newStatus || calculatedStatus);
        const finalPenalty = calculatedPenalty;

        // 6. Adjust monthly points if status changed
        const oldStatus = existingRecord.status || 'present';
        const month = newClockInDate.toISOString().slice(0, 7); // YYYY-MM format

        if (existingRecord.users?.id) {
            await adjustPointsForStatusChange(
                existingRecord.users.id,
                oldStatus,
                finalStatus,
                month
            );
        }

        // 7. Update attendance record
        const { data: updatedRecord, error: updateError } = await supabase
            .from('attendance')
            .update({
                clock_in: newClockInDate.toISOString(),
                status: finalStatus,
                penalty_amount: finalPenalty
            })
            .eq('id', attendanceId)
            .select('*, users:user_id(full_name)')
            .single();

        if (updateError) {
            console.error("Update error:", updateError);
            return { success: false, error: "Gagal mengemaskini rekod: " + updateError.message };
        }

        // 8. Return success with updated record
        return {
            success: true,
            message: `Rekod berjaya dikemaskini. Status: ${finalStatus}, Penalti: RM${finalPenalty.toFixed(2)}`,
            updatedRecord
        };

    } catch (error: any) {
        console.error("Error in updateAttendanceAction:", error);
        return {
            success: false,
            error: error.message || "Ralat tidak dijangka berlaku."
        };
    }
}
