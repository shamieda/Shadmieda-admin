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
            <div className="bg-surface border border-white/5 rounded-2xl p-8 text-center">
                <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Tiada sejarah points lagi</p>
            </div>
        );
    }

    return (
        <div className="bg-surface border border-white/5 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Sejarah Points</h3>

            <div className="space-y-3">
                {history.map((event) => (
                    <div
                        key={event.month}
                        className="bg-black/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white mb-2">
                                    {formatMonth(event.month)}
                                </p>
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1 text-green-400">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>+{event.good_deeds_count}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-red-400">
                                        <XCircle className="w-3 h-3" />
                                        <span>-{event.bad_deeds_count}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-2xl font-bold ${event.points > 0 ? 'text-primary' :
                                        event.points < 0 ? 'text-red-400' : 'text-gray-500'
                                    }`}>
                                    {event.points > 0 ? '+' : ''}{event.points}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
