import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface PointEvent {
    month: string;
    points: number;
    good_deeds_count: number;
    bad_deeds_count: number;
}

interface PointsTimelineProps {
    history: PointEvent[];
}

export default function PointsTimeline({ history }: PointsTimelineProps) {
    const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });
    };

    if (history.length === 0) {
        return (
            <div className="bg-black/30 border border-white/5 rounded-xl p-6 md:p-8 text-center">
                <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Tiada sejarah points lagi</p>
            </div>
        );
    }

    return (
        <div className="bg-black/30 border border-white/5 rounded-xl p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6">Sejarah Points (6 Bulan Terakhir)</h3>

            <div className="space-y-3 md:space-y-4">
                {history.map((event, index) => (
                    <div
                        key={event.month}
                        className="bg-black/50 border border-white/10 rounded-lg p-3 md:p-4 hover:border-primary/30 transition-colors"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex-1">
                                <p className="text-sm md:text-base font-bold text-white mb-1">
                                    {formatMonth(event.month)}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                                    <div className="flex items-center gap-1 text-green-400">
                                        <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4" />
                                        <span>+{event.good_deeds_count} Good</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-red-400">
                                        <XCircle className="w-3 h-3 md:w-4 md:h-4" />
                                        <span>-{event.bad_deeds_count} Bad</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xl md:text-2xl font-bold ${event.points > 0 ? 'text-primary' :
                                        event.points < 0 ? 'text-red-400' : 'text-gray-400'
                                    }`}>
                                    {event.points > 0 ? '+' : ''}{event.points}
                                </span>
                                <span className="text-xs text-gray-500">pts</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
