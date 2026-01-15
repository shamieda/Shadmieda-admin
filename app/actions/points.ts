"use server";

import { supabase } from "@/lib/supabase";

/**
 * Ensures a monthly_points record exists for a user in a given month
 */
async function ensureMonthlyPointsExist(userId: string, month: string) {
    const { data: existing } = await supabase
        .from('monthly_points')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .single();

    if (!existing) {
        await supabase
            .from('monthly_points')
            .insert({
                user_id: userId,
                month,
                points: 0,
                good_deeds_count: 0,
                bad_deeds_count: 0
            });
    }
}

/**
 * Award a good deed (+1 point)
 */
export async function awardGoodDeedAction(userId: string, month?: string) {
    try {
        const targetMonth = month || new Date().toISOString().slice(0, 7);

        // Ensure record exists
        await ensureMonthlyPointsExist(userId, targetMonth);

        // Increment good deeds and points
        const { error } = await supabase.rpc('increment_good_deed', {
            p_user_id: userId,
            p_month: targetMonth
        });

        if (error) {
            // Fallback to manual update if RPC doesn't exist
            const { data: current } = await supabase
                .from('monthly_points')
                .select('points, good_deeds_count')
                .eq('user_id', userId)
                .eq('month', targetMonth)
                .single();

            if (current) {
                await supabase
                    .from('monthly_points')
                    .update({
                        points: (current.points || 0) + 1,
                        good_deeds_count: (current.good_deeds_count || 0) + 1
                    })
                    .eq('user_id', userId)
                    .eq('month', targetMonth);
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error awarding good deed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Deduct a bad deed (-1 point)
 */
export async function deductBadDeedAction(userId: string, month?: string) {
    try {
        const targetMonth = month || new Date().toISOString().slice(0, 7);

        // Ensure record exists
        await ensureMonthlyPointsExist(userId, targetMonth);

        // Increment bad deeds and decrement points
        const { data: current } = await supabase
            .from('monthly_points')
            .select('points, bad_deeds_count')
            .eq('user_id', userId)
            .eq('month', targetMonth)
            .single();

        if (current) {
            await supabase
                .from('monthly_points')
                .update({
                    points: (current.points || 0) - 1,
                    bad_deeds_count: (current.bad_deeds_count || 0) + 1
                })
                .eq('user_id', userId)
                .eq('month', targetMonth);
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error deducting bad deed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check if all daily tasks are complete for a user on a specific date
 */
export async function checkAllDailyTasksCompleteAction(userId: string, date: string) {
    try {
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;

        const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', userId)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

        if (!tasks || tasks.length === 0) {
            return { allComplete: false, totalTasks: 0 };
        }

        const allComplete = tasks.every((task: any) => task.is_completed);
        return { allComplete, totalTasks: tasks.length };
    } catch (error: any) {
        console.error('Error checking tasks:', error);
        return { allComplete: false, totalTasks: 0, error: error.message };
    }
}
