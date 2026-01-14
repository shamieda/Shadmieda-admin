"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getRankingsAction(month: string) {
    try {
        if (!supabaseAdmin) {
            return { success: false, error: "Supabase Admin client is not initialized." };
        }

        const startDate = `${month}-01T00:00:00`;
        const endDate = `${month}-31T23:59:59`;

        // 1. Fetch all staff
        const { data: staffList, error: staffError } = await supabaseAdmin
            .from('users')
            .select('id, full_name, avatar_url, role, position')
            .eq('role', 'staff');

        if (staffError) throw staffError;

        // 2. Fetch attendance for the month
        const { data: attendance, error: attendanceError } = await supabaseAdmin
            .from('attendance')
            .select('user_id, status, penalty_amount')
            .gte('clock_in', startDate)
            .lte('clock_in', endDate);

        if (attendanceError) throw attendanceError;

        // 3. Fetch tasks for the month
        const { data: tasks, error: tasksError } = await supabaseAdmin
            .from('tasks')
            .select('assigned_to, is_completed')
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (tasksError) throw tasksError;

        // 4. Calculate scores
        const rankings = (staffList || []).map((staff: any) => {
            const staffAttendance = attendance?.filter((a: any) => a.user_id === staff.id) || [];
            const staffTasks = tasks?.filter((t: any) => t.assigned_to === staff.id) || [];

            let score = 0;

            // Attendance Points: +10 for present, -5 for late, -10 for absent
            staffAttendance.forEach((a: any) => {
                if (a.status === 'present') score += 10;
                else if (a.status === 'late') score -= 5;
                else if (a.status === 'absent') score -= 10;

                // Penalty deduction: -1 point for every RM1 penalty
                score -= Math.floor(Number(a.penalty_amount || 0));
            });

            // Task Points: +5 for completed task
            staffTasks.forEach((t: any) => {
                if (t.is_completed) score += 5;
            });

            return {
                id: staff.id,
                full_name: staff.full_name,
                avatar_url: staff.avatar_url,
                position: staff.position,
                score
            };
        });

        // Sort by score descending
        rankings.sort((a: any, b: any) => b.score - a.score);

        return { success: true, rankings: rankings.slice(0, 3) };
    } catch (error: any) {
        console.error('Get Rankings Error:', error);
        return { success: false, error: error.message };
    }
}
