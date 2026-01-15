import { useState, useEffect } from "react";
import { CheckCircle, Clock, CalendarX, Filter, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AttendanceHistory() {
    const [filter, setFilter] = useState<'all' | 'late' | 'leave'>('all');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();

        // Realtime Subscription
        const channel = supabase
            .channel('attendance_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'attendance'
                },
                (payload) => {
                    console.log('Change received!', payload);
                    fetchHistory();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Get public.users id first
                const { data: profile } = await supabase
                    .from('users')
                    .select('id')
                    .eq('auth_id', user.id)
                    .single();

                if (profile) {
                    const { data, error } = await supabase
                        .from('attendance')
                        .select('*')
                        .eq('user_id', profile.id)
                        .order('clock_in', { ascending: false });

                    if (error) throw error;
                    setHistory(data || []);
                }
            }
        } catch (error) {
            console.error('Error fetching attendance history:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = history.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'late') return item.status === 'late';
        if (filter === 'leave') return item.status === 'absent'; // Mapping absent to leave for now
        return true;
    });

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'late':
                return {
                    bg: 'bg-red-500/10 border-red-500/30',
                    iconBg: 'bg-red-500/20 text-red-400',
                    badge: 'bg-red-500/20 text-red-400',
                    icon: Clock,
                    label: 'Lewat'
                };
            case 'absent':
                return {
                    bg: 'bg-blue-500/10 border-blue-500/30',
                    iconBg: 'bg-blue-500/20 text-blue-400',
                    badge: 'bg-blue-500/20 text-blue-400',
                    icon: CalendarX,
                    label: 'Tidak Hadir'
                };
            default:
                return {
                    bg: 'bg-surface border-white/5',
                    iconBg: 'bg-green-500/20 text-green-400',
                    badge: 'bg-green-500/20 text-green-400',
                    icon: CheckCircle,
                    label: 'Hadir'
                };
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ms-MY', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="pt-8 border-t border-white/10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-lg font-bold text-white">Sejarah Kehadiran</h2>
                <div className="flex bg-white/5 rounded-lg p-1 gap-1 w-full sm:w-auto overflow-x-auto">
                    <button
                        onClick={fetchHistory}
                        className="px-3 py-1 rounded-md text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="w-px bg-white/10 mx-1"></div>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${filter === 'all' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        SEMUA
                    </button>
                    <button
                        onClick={() => setFilter('late')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${filter === 'late' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        LEWAT
                    </button>
                    <button
                        onClick={() => setFilter('leave')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${filter === 'leave' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        CUTI
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center py-12 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-xs">Memuatkan sejarah...</p>
                    </div>
                ) : (
                    filteredData.map((record) => {
                        const styles = getStatusStyles(record.status);
                        const Icon = styles.icon;

                        return (
                            <div
                                key={record.id}
                                className={`p-4 rounded-xl border flex justify-between items-center transition-all ${styles.bg}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.iconBg}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">{formatDate(record.clock_in)}</p>
                                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">
                                            {record.clock_in ? new Date(record.clock_in).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : 'Rekod Sistem'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter ${styles.badge}`}>
                                        {styles.label}
                                    </span>
                                    {record.penalty_amount > 0 && (
                                        <span className="text-[10px] text-red-400 font-bold">
                                            - RM {record.penalty_amount.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}

                {!loading && filteredData.length === 0 && (
                    <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                        <Filter className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-20" />
                        <p className="text-gray-500 text-xs">Tiada rekod dijumpai.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
