"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Clock, ClipboardList, Wallet, User, Loader2, Trophy, Medal } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getRankingsAction } from "@/app/actions/get-rankings";
import { getStaffPointsHistoryAction } from "@/app/actions/rankings";
import PointsHistoryCard from "@/components/PointsHistoryCard";

export default function StaffDashboard() {
    const [userName, setUserName] = useState<string>("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [rankings, setRankings] = useState<any[]>([]);
    const [rankingsLoading, setRankingsLoading] = useState(true);
    const [userPoints, setUserPoints] = useState<any>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchProfile();
        fetchRankings();
    }, []);

    useEffect(() => {
        if (userId) {
            fetchUserPoints();
        }
    }, [userId]);

    const fetchRankings = async () => {
        const month = new Date().toISOString().substring(0, 7);
        const result = await getRankingsAction(month);
        if (result.success) {
            setRankings(result.rankings || []);
        }
        setRankingsLoading(false);
    };

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('users')
                    .select('id, full_name, avatar_url')
                    .eq('auth_id', user.id)
                    .single();
                if (data) {
                    setUserName(data.full_name);
                    setAvatarUrl(data.avatar_url);
                    setUserId(data.id);
                }
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPoints = async () => {
        if (!userId) return;
        try {
            const month = new Date().toISOString().substring(0, 7);
            const result = await getRankingsAction(month);
            if (result.success) {
                const userRanking = result.rankings?.find((r: any) => r.id === userId);
                // Always set userPoints, even if no data (show 0 points)
                setUserPoints(userRanking || {
                    id: userId,
                    points: 0,
                    good_deeds_count: 0,
                    bad_deeds_count: 0,
                    rank: 0,
                    reward_amount: 0
                });
            }
        } catch (error) {
            console.error('Error fetching user points:', error);
            // Set default values on error
            setUserPoints({
                id: userId,
                points: 0,
                good_deeds_count: 0,
                bad_deeds_count: 0,
                rank: 0,
                reward_amount: 0
            });
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Staff Dashboard</h1>
                    {loading ? (
                        <div className="flex items-center gap-2 text-gray-400 mt-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <p className="text-sm">Memuatkan...</p>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm sm:text-base">Selamat datang, {userName || 'Staff'}.</p>
                    )}
                </div>
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-black font-bold uppercase overflow-hidden border-2 border-primary/20 shadow-lg">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                    ) : (
                        userName ? userName.charAt(0) : 'S'
                    )}
                </div>
            </div>

            {/* Personal Points Card */}
            {userPoints && (
                <PointsHistoryCard
                    points={userPoints.points || 0}
                    goodDeeds={userPoints.good_deeds_count || 0}
                    badDeeds={userPoints.bad_deeds_count || 0}
                    rank={userPoints.rank || 0}
                    rewardAmount={userPoints.reward_amount || 0}
                />
            )}

            {/* Top 3 Employees Card - Podium Style */}
            <div className="bg-surface border border-white/5 rounded-3xl p-6 md:p-10 overflow-hidden relative bg-gradient-to-b from-surface to-black/50">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Trophy className="w-48 h-48 text-primary" />
                </div>
                <div className="absolute top-10 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                <div className="text-center mb-12 relative">
                    <p className="text-[10px] font-black tracking-[0.3em] text-primary/60 uppercase mb-2">Leaderboard</p>
                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
                        Top <span className="text-primary">#Employee</span>
                    </h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Of The Month</p>
                </div>

                {rankingsLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : rankings.length === 0 ? (
                    <div className="text-center py-12 bg-black/20 rounded-2xl border border-white/5">
                        <p className="text-gray-500 text-sm italic">Ranking belum dijana untuk bulan ini.</p>
                    </div>
                ) : (
                    <div className="flex flex-row items-end justify-center gap-2 sm:gap-4 md:gap-8 lg:gap-16 pt-8 max-w-2xl mx-auto">
                        {/* Rank 2 */}
                        <div className="flex flex-col items-center text-center flex-1 group">
                            {rankings[1] ? (
                                <>
                                    <div className="relative mb-2 sm:mb-4">
                                        <div className="w-14 h-14 sm:w-20 md:w-24 rounded-full p-0.5 sm:p-1 bg-gradient-to-tr from-gray-400 to-gray-100 shadow-xl group-hover:scale-105 transition-transform">
                                            <div className="w-full h-full rounded-full bg-surface overflow-hidden border border-surface">
                                                {rankings[1].avatar_url ? (
                                                    <img src={rankings[1].avatar_url} alt={rankings[1].full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-lg sm:text-2xl font-bold bg-white/5 text-gray-400">
                                                        {rankings[1].full_name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-gray-300 text-black flex items-center justify-center font-black text-[10px] sm:text-sm shadow-lg border-2 border-surface">
                                            2
                                        </div>
                                    </div>
                                    <h3 className="text-white font-bold text-[9px] sm:text-sm mb-0.5 truncate w-full px-1">{rankings[1].full_name}</h3>
                                    <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase font-bold mb-1 sm:mb-2">Stesen: {rankings[1].position || 'Staff'}</p>
                                    <div className="hidden sm:flex gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Medal key={i} className={clsx("w-2 h-2 md:w-3 md:h-3", i < 4 ? "text-yellow-500" : "text-gray-700")} />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="w-14 h-14 sm:w-20 md:w-24 rounded-full border-2 border-dashed border-white/5" />
                            )}
                        </div>

                        {/* Rank 1 */}
                        <div className="flex flex-col items-center text-center flex-1 group -translate-y-4 sm:-translate-y-10">
                            {rankings[0] ? (
                                <>
                                    <div className="relative mb-2 sm:mb-4">
                                        <div className="w-20 h-20 sm:w-32 md:w-36 rounded-full p-1 sm:p-1.5 bg-gradient-to-tr from-primary to-yellow-200 shadow-2xl shadow-primary/20 group-hover:scale-105 transition-transform">
                                            <div className="w-full h-full rounded-full bg-surface overflow-hidden border-2 border-surface">
                                                {rankings[0].avatar_url ? (
                                                    <img src={rankings[0].avatar_url} alt={rankings[0].full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-2xl sm:text-5xl font-bold bg-white/5 text-primary">
                                                        {rankings[0].full_name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-12 sm:h-12 rounded-full bg-primary text-black flex items-center justify-center font-black text-xs sm:text-xl shadow-lg border-2 border-surface">
                                            1
                                        </div>
                                        <Medal className="absolute -top-4 sm:-top-10 left-1/2 -translate-x-1/2 w-4 h-4 sm:w-10 sm:h-10 text-primary animate-bounce" />
                                    </div>
                                    <h3 className="text-white font-black text-[10px] sm:text-lg mb-0.5 truncate w-full px-1">{rankings[0].full_name}</h3>
                                    <p className="text-[8px] sm:text-xs text-primary font-bold uppercase mb-1 sm:mb-3">Stesen: {rankings[0].position || 'Staff'}</p>
                                    <div className="hidden sm:flex gap-0.5 md:gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Medal key={i} className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="w-20 h-20 sm:w-32 md:w-36 rounded-full border-2 border-dashed border-white/5" />
                            )}
                        </div>

                        {/* Rank 3 */}
                        <div className="flex flex-col items-center text-center flex-1 group">
                            {rankings[2] ? (
                                <>
                                    <div className="relative mb-2 sm:mb-4">
                                        <div className="w-14 h-14 sm:w-20 md:w-24 rounded-full p-0.5 sm:p-1 bg-gradient-to-tr from-orange-700 to-orange-400 shadow-xl group-hover:scale-105 transition-transform">
                                            <div className="w-full h-full rounded-full bg-surface overflow-hidden border border-surface">
                                                {rankings[2].avatar_url ? (
                                                    <img src={rankings[2].avatar_url} alt={rankings[2].full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-lg sm:text-2xl font-bold bg-white/5 text-orange-400">
                                                        {rankings[2].full_name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-orange-500 text-black flex items-center justify-center font-black text-[10px] sm:text-sm shadow-lg border-2 border-surface">
                                            3
                                        </div>
                                    </div>
                                    <h3 className="text-white font-bold text-[9px] sm:text-sm mb-0.5 truncate w-full px-1">{rankings[2].full_name}</h3>
                                    <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase font-bold mb-1 sm:mb-2">Stesen: {rankings[2].position || 'Staff'}</p>
                                    <div className="hidden sm:flex gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Medal key={i} className={clsx("w-2 h-2 md:w-3 md:h-3", i < 3 ? "text-yellow-500" : "text-gray-700")} />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="w-14 h-14 sm:w-20 md:w-24 rounded-full border-2 border-dashed border-white/5" />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Clock In/Out */}
                <Link href="/staff/attendance" className="bg-surface border border-white/5 p-8 rounded-2xl hover:border-primary/50 hover:bg-white/5 transition-all group flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Clock className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Rekod Kehadiran</h3>
                    <p className="text-gray-400 text-sm">Clock-in & Clock-out dengan GPS & Selfie.</p>
                </Link>

                {/* Tasks */}
                <Link href="/staff/tasks?sync=true" className="bg-surface border border-white/5 p-8 rounded-2xl hover:border-green-400/50 hover:bg-white/5 transition-all group flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-green-400/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <ClipboardList className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Senarai Tugas</h3>
                    <p className="text-gray-400 text-sm">Lihat dan tandakan tugasan harian anda.</p>
                </Link>
            </div>

            {/* Secondary Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/staff/payroll" className="bg-surface border border-white/5 p-6 rounded-xl flex items-center gap-4 hover:bg-white/5 hover:border-blue-500/50 transition-all group">
                    <div className="p-3 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
                        <Wallet className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold group-hover:text-blue-400 transition-colors">Gaji & Advance</h3>
                        <p className="text-xs text-gray-500">Lihat gaji semasa & mohon advance.</p>
                    </div>
                </Link>

                <Link href="/staff/settings" className="bg-surface border border-white/5 p-6 rounded-xl flex items-center gap-4 hover:bg-white/5 hover:border-purple-500/50 transition-all group">
                    <div className="p-3 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform">
                        <User className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold group-hover:text-purple-400 transition-colors">Profil Saya</h3>
                        <p className="text-xs text-gray-500">Kemaskini maklumat peribadi.</p>
                    </div>
                </Link>
            </div>
        </div >
    );
}
