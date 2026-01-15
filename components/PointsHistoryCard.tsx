import { Trophy, TrendingUp, TrendingDown, Award } from "lucide-react";

interface PointsHistoryCardProps {
    points: number;
    goodDeeds: number;
    badDeeds: number;
    rank: number;
    rewardAmount: number;
    trend?: 'up' | 'down' | 'neutral';
}

export default function PointsHistoryCard({
    points,
    goodDeeds,
    badDeeds,
    rank,
    rewardAmount,
    trend = 'neutral'
}: PointsHistoryCardProps) {
    const getRankBadge = () => {
        if (rank === 1) return { emoji: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
        if (rank === 2) return { emoji: '🥈', color: 'text-gray-300', bg: 'bg-gray-500/20' };
        if (rank === 3) return { emoji: '🥉', color: 'text-orange-400', bg: 'bg-orange-500/20' };
        return { emoji: `#${rank}`, color: 'text-gray-400', bg: 'bg-gray-500/10' };
    };

    const badge = getRankBadge();

    return (
        <div className="bg-black/30 border border-white/5 rounded-xl p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-lg md:text-xl font-bold text-white mb-1">Shamieda Points</h3>
                    <p className="text-xs md:text-sm text-gray-400">Prestasi Bulanan</p>
                </div>
                <div className={`${badge.bg} ${badge.color} px-4 py-2 rounded-lg font-bold text-lg md:text-xl flex items-center gap-2 w-fit`}>
                    <Trophy className="w-5 h-5" />
                    {badge.emoji}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {/* Total Points */}
                <div className="bg-black/50 p-3 md:p-4 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Total Points</span>
                        {trend !== 'neutral' && (
                            trend === 'up' ?
                                <TrendingUp className="w-4 h-4 text-green-400" /> :
                                <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-white">{points}</p>
                </div>

                {/* Good Deeds */}
                <div className="bg-black/50 p-3 md:p-4 rounded-lg border border-white/10">
                    <span className="text-xs text-gray-400 block mb-2">Good Deeds</span>
                    <p className="text-xl md:text-2xl font-bold text-green-400">+{goodDeeds}</p>
                </div>

                {/* Bad Deeds */}
                <div className="bg-black/50 p-3 md:p-4 rounded-lg border border-white/10">
                    <span className="text-xs text-gray-400 block mb-2">Bad Deeds</span>
                    <p className="text-xl md:text-2xl font-bold text-red-400">-{badDeeds}</p>
                </div>

                {/* Reward */}
                <div className="bg-primary/10 p-3 md:p-4 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-1 mb-2">
                        <Award className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                        <span className="text-xs text-primary">Ganjaran</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-primary">RM{rewardAmount.toFixed(2)}</p>
                </div>
            </div>
        </div>
    );
}
