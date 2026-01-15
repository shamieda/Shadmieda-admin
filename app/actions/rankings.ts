"use server";

import { supabase } from "@/lib/supabase";

export interface RankingData {
    id: string;
    full_name: string;
    avatar_url: string | null;
    position: string | null;
    points: number;
    good_deeds_count: number;
    bad_deeds_count: number;
    rank: number;
    reward_amount: number;
}

export async function getRankingsAction(month?: string) {
    try {
        // Default to current month if not provided
        const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM format

        // Fetch shop settings for reward amounts
        const { data: settings } = await supabase
            .from('shop_settings')
            .select('ranking_reward_1, ranking_reward_2, ranking_reward_3')
            .single();

        // Fetch monthly points with user data
        const { data: pointsData, error } = await supabase
            .from('monthly_points')
            .select(`
                user_id,
                points,
                good_deeds_count,
                bad_deeds_count,
                users!inner (
                    id,
                    full_name,
                    avatar_url,
                    position
                )
            `)
            .eq('month', targetMonth)
            .order('points', { ascending: false });

        if (error) throw error;

        // Transform and rank the data
        const rankings: RankingData[] = (pointsData || []).map((entry: any, index: number) => {
            const rank = index + 1;
            let reward_amount = 0;

            // Assign rewards based on rank
            if (rank === 1) reward_amount = Number(settings?.ranking_reward_1 || 100);
            else if (rank === 2) reward_amount = Number(settings?.ranking_reward_2 || 50);
            else if (rank === 3) reward_amount = Number(settings?.ranking_reward_3 || 25);

            return {
                id: entry.users.id,
                full_name: entry.users.full_name,
                avatar_url: entry.users.avatar_url,
                position: entry.users.position,
                points: entry.points || 0,
                good_deeds_count: entry.good_deeds_count || 0,
                bad_deeds_count: entry.bad_deeds_count || 0,
                rank,
                reward_amount
            };
        });

        return { success: true, data: rankings };
    } catch (error: any) {
        console.error('Error fetching rankings:', error);
        return { success: false, error: error.message, data: [] };
    }
}

export async function getStaffPointsHistoryAction(userId: string) {
    try {
        // Fetch last 6 months of points history
        const { data, error } = await supabase
            .from('monthly_points')
            .select('*')
            .eq('user_id', userId)
            .order('month', { ascending: false })
            .limit(6);

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error('Error fetching staff points history:', error);
        return { success: false, error: error.message, data: [] };
    }
}
