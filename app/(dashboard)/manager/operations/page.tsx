"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Clock, AlertTriangle, Image as ImageIcon, Loader2, ClipboardList, Calendar, Bell, X, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { broadcastNotificationAction } from "@/app/actions/notifications";

export default function OperationsPage() {
    const [stations, setStations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const selectedStaff = stations.find(s => s.id === selectedStaffId);
    const [isRealTimeActive, setIsRealTimeActive] = useState(false);

    useEffect(() => {
        fetchOperations();

        // Set up real-time subscription for task updates
        const channel = supabase
            .channel('tasks-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'tasks',
                    filter: undefined // Listen to all task changes to ensure updates are caught
                },
                (payload) => {
                    console.log('Task changed:', payload);
                    // Refetch operations when any task changes
                    fetchOperations();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setIsRealTimeActive(true);
                    console.log('Real-time updates active');
                }
            });

        // Cleanup subscription on unmount or date change
        return () => {
            setIsRealTimeActive(false);
            supabase.removeChannel(channel);
        };
    }, [selectedDate]);

    const fetchOperations = async () => {
        setLoading(true);
        try {
            const { data: staffMembers, error: staffError } = await supabase
                .from('users')
                .select('id, full_name, position')
                .in('role', ['staff', 'supervisor'])
                .order('full_name');

            if (staffError) throw staffError;

            const { data: tasks, error: tasksError } = await supabase
                .from('tasks')
                .select('*')
                .gte('created_at', `${selectedDate}T00:00:00`)
                .lte('created_at', `${selectedDate}T23:59:59`);

            if (tasksError) throw tasksError;

            const staffList = (staffMembers || []).map(staff => {
                const memberTasks = (tasks || []).filter(t => t.assigned_to === staff.id);
                const completed = memberTasks.filter(t => t.is_completed).length;
                const total = memberTasks.length;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

                return {
                    id: staff.id,
                    name: staff.full_name || 'Unknown Staff',
                    position: staff.position || 'Staff',
                    tasks: memberTasks,
                    completed,
                    total,
                    progress,
                    pending: total - completed,
                    status: progress === 100 && total > 0 ? 'Completed' : progress > 0 ? 'Active' : 'Idle'
                };
            });

            setStations(staffList);
        } catch (error) {
            console.error('Error fetching operations:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Operasi Lantai</h1>
                    <p className="text-gray-400 text-sm">Pantau status tugasan setiap stesen secara real-time.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-surface border border-white/10 rounded-lg py-2 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-primary"
                        />
                    </div>
                    {selectedDate === new Date().toISOString().split('T')[0] && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        // Use Broadcast Action instead of looping in client
                                        const result = await broadcastNotificationAction({
                                            title: "Tugasan Baru",
                                            message: "Tugasan harian anda telah sedia. Sila semak senarai tugas anda.",
                                            type: "info",
                                            category: "task",
                                            targetRole: "staff",
                                            link: "/staff/tasks"
                                        });

                                        if (result.success) {
                                            alert(`Notifikasi telah dihantar secara pukal kepada semua staff.`);
                                        } else {
                                            throw new Error(result.error);
                                        }
                                    } catch (err: any) {
                                        console.error("Error broadcasting to staff:", err);
                                        alert("Ralat menghantar notifikasi pukal: " + err.message);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                            >
                                <Bell className="w-4 h-4" />
                                NOTIFY STAFF
                            </button>
                            <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ml-2 ${isRealTimeActive ? 'bg-green-400/10 text-green-400' : 'bg-gray-400/10 text-gray-400'}`}>
                                <span className={`w-2 h-2 rounded-full ${isRealTimeActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                                {isRealTimeActive ? 'LIVE' : 'OFFLINE'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p>Memuatkan status operasi...</p>
                </div>
            ) : stations.length === 0 ? (
                <div className="bg-surface border border-white/5 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Tiada Tugasan Hari Ini</h3>
                    <p className="text-gray-500 text-sm">Sila jana tugasan dari template untuk mula memantau.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stations.map((staff, idx) => (
                        <div key={idx} className="bg-surface border border-white/5 rounded-xl overflow-hidden hover:border-primary/30 transition-all group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{staff.name}</h3>
                                        <p className="text-sm text-gray-400">Stesen: <span className="text-primary">{staff.position}</span></p>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold ${staff.status === 'Completed' ? 'bg-green-400/10 text-green-400' :
                                        staff.status === 'Active' ? 'bg-blue-400/10 text-blue-400' :
                                            'bg-gray-400/10 text-gray-400'
                                        }`}>
                                        {staff.status}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">Siap</span>
                                        <span className="text-white font-bold">{staff.progress}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{ width: `${staff.progress}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                        <span>{staff.pending} Pending</span>
                                    </div>
                                    <button
                                        onClick={() => setSelectedStaffId(staff.id)}
                                        className="bg-primary text-black hover:bg-yellow-400 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
                                    >
                                        Lihat Detail
                                    </button>
                                </div>
                            </div>

                            <div className="bg-black/30 p-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-xs text-gray-500">Bukti Terkini:</span>
                                <div className="flex gap-2">
                                    {staff.tasks.filter((t: any) => t.proof_url).slice(0, 2).map((t: any, i: number) => (
                                        <a key={i} href={t.proof_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer overflow-hidden">
                                            <img src={t.proof_url} alt="Proof" className="w-full h-full object-cover" />
                                        </a>
                                    ))}
                                    {staff.tasks.filter((t: any) => t.proof_url).length === 0 && (
                                        <div className="text-xs text-gray-600 italic">Tiada bukti lagi</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Task Details Modal */}
            {selectedStaff && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedStaffId(null)}>
                    <div className="bg-surface border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 border-b border-white/10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{selectedStaff.name}</h2>
                                    <p className="text-sm text-gray-400">Stesen: <span className="text-primary font-bold">{selectedStaff.position}</span></p>
                                </div>
                                <button
                                    onClick={() => setSelectedStaffId(null)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="mt-4 flex gap-4">
                                <div className="bg-black/30 px-4 py-2 rounded-lg">
                                    <p className="text-xs text-gray-400">Total Tugasan</p>
                                    <p className="text-xl font-bold text-white">{selectedStaff.total}</p>
                                </div>
                                <div className="bg-green-400/10 px-4 py-2 rounded-lg">
                                    <p className="text-xs text-green-400">Selesai</p>
                                    <p className="text-xl font-bold text-green-400">{selectedStaff.completed}</p>
                                </div>
                                <div className="bg-yellow-400/10 px-4 py-2 rounded-lg">
                                    <p className="text-xs text-yellow-400">Pending</p>
                                    <p className="text-xl font-bold text-yellow-400">{selectedStaff.pending}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
                            <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Senarai Tugasan</h3>
                            {selectedStaff.tasks.length === 0 ? (
                                <p className="text-gray-500 text-center py-8 italic">Tiada tugasan untuk hari ini</p>
                            ) : (
                                <div className="space-y-3">
                                    {selectedStaff.tasks.map((task: any, idx: number) => (
                                        <div key={idx} className={`bg-black/30 border rounded-xl p-4 ${task.is_completed ? 'border-green-400/20' : 'border-white/5'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <h4 className="text-white font-bold mb-1">{task.title}</h4>
                                                    {task.description && (
                                                        <p className="text-sm text-gray-400">{task.description}</p>
                                                    )}
                                                </div>
                                                <div className={`px-2 py-1 rounded text-xs font-bold ml-2 ${task.is_completed ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>
                                                    {task.is_completed ? '✓ Selesai' : 'Pending'}
                                                </div>
                                            </div>
                                            {task.deadline_time && (
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                                    <Clock className="w-3 h-3" />
                                                    Deadline: {task.deadline_time}
                                                </div>
                                            )}
                                            {task.proof_url && (
                                                <a
                                                    href={task.proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-xs text-primary hover:text-yellow-400 transition-colors"
                                                >
                                                    <ImageIcon className="w-3 h-3" />
                                                    Lihat Bukti
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-black/30 p-4 border-t border-white/10 flex justify-end">
                            <button
                                onClick={() => setSelectedStaffId(null)}
                                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-bold transition-all"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
