/**
 * Centralized utility for attendance-related calculations
 */

export interface ShopSettings {
    start_time: string;
    late_penalty_per_minute: number | string;
    penalty_15m: number | string;
    penalty_30m: number | string;
    penalty_max: number | string;
}

/**
 * Calculates penalty and status for a given clock-in time and shop settings.
 * Handles timezone differences by comparing time-of-day in Asia/Kuala_Lumpur.
 * 
 * @param clockInTime The Date object of the clock-in
 * @param shopSettings The shop configuration settings
 * @returns { status: string, penalty: number }
 */
export function calculatePenalty(clockInTime: Date, shopSettings: ShopSettings) {
    const [startH, startM, startS] = shopSettings.start_time.split(':').map(Number);

    // Use Intl.DateTimeFormat to get the clock-in time components in the shop's timezone
    // Defaulting to Asia/Kuala_Lumpur for Malaysia where Shah Alam is located.
    // This ensures we compare "10:00 AM Malaysia" with "09:00 AM Shop Time" 
    // even if the server is running in UTC.
    try {
        const formatter = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Kuala_Lumpur'
        });

        const timeString = formatter.format(clockInTime); // Returns "HH:MM:SS"
        const [clockH, clockM, clockS] = timeString.split(':').map(Number);

        // Convert both to seconds since start of day for a stable comparison reference
        const clockInSeconds = clockH * 3600 + clockM * 60 + clockS;
        const startSeconds = startH * 3600 + startM * 60 + (startS || 0);

        // Debug logging for developers if needed (viewable in server logs)
        // console.log(`[Penalty Calculation] Clock-In (MY): ${timeString}, Start: ${shopSettings.start_time}`);

        // If clocked in before or at start time, no penalty
        if (clockInSeconds <= startSeconds) {
            return { status: 'present', penalty: 0 };
        }

        // Calculate how late in minutes
        const diffMins = Math.floor((clockInSeconds - startSeconds) / 60);

        let penalty = 0;
        const status = 'late';

        // Safely convert settings to numbers (they might come as strings from DB decimal columns)
        const penalty_max = Number(shopSettings.penalty_max || 0);
        const penalty_30m = Number(shopSettings.penalty_30m || 0);
        const penalty_15m = Number(shopSettings.penalty_15m || 0);
        const late_penalty_per_minute = Number(shopSettings.late_penalty_per_minute || 0);

        // Tiered Penalty Logic
        if (penalty_max > 0 && diffMins > 30) {
            penalty = penalty_max;
        } else if (penalty_30m > 0 && diffMins > 15) {
            penalty = penalty_30m;
        } else if (penalty_15m > 0 && diffMins > 0) {
            penalty = penalty_15m;
        } else {
            // Fallback to per-minute
            penalty = diffMins * late_penalty_per_minute;
        }

        return { status, penalty };
    } catch (err) {
        console.error("Error in timezone-aware penalty calculation:", err);
        // Extreme fallback to legacy behavior if Intl fails
        return { status: 'late', penalty: 0 };
    }
}

/**
 * Normalizes status values to ensure database constraint compliance ('present', 'late', 'absent')
 */
export function normalizeStatus(status: string): string {
    if (!status) return 'present';
    const lower = status.toLowerCase();
    if (lower === 'late' || lower === 'lewat') return 'late';
    if (lower === 'present' || lower === 'hadir') return 'present';
    if (lower === 'absent' || lower === 'ponteng') return 'absent';
    return lower;
}
