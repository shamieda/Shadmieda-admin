"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Clock, AlertTriangle, Image as ImageIcon, Loader2, ClipboardList, Calendar, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createNotificationAction } from "@/app/actions/notifications";

export default function OperationsPage() {
    const [stations, setStations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchOperations();
    }, [selectedDate]);

    const fetchOperations = async () => {
        setLoading(true);
        try {
            // 1. Fetch all staff members
            const { data: staffMembers, error: staffError } = await supabase
                .from('users')
                .select('id, full_name, position')
                .eq('role', 'staff')
                .order('full_name');

            if (staffError) throw staffError;

            // 2. Fetch all tasks for the selected date
            const { data: tasks, error: tasksError } = await supabase
                .from('tasks')
                .select('*')
                .gte('created_at', `${selectedDate}T00:00:00`)
                .lte('created_at', `${selectedDate}T23:59:59`);

            if (tasksError) throw tasksError;

            // 3. Group tasks by staff member
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

            setStations(staffList); // Reusing the 'stations' state name for now to minimize UI changes
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
                                        // Get all staff who have tasks today
                                        const { data: tasks } = await supabase
                                            .from('tasks')
                                            .select('assigned_to, title')
                                            .gte('created_at', `${selectedDate}T00:00:00`)
                                            .lte('created_at', `${selectedDate}T23:59:59`);

                                        console.log("DEBUG: Tasks found for notification:", tasks?.length);

                                        if (tasks && tasks.length > 0) {
                                            const uniqueStaff = Array.from(new Set(tasks.map(t => t.assigned_to)));
                                            console.log("DEBUG: Unique staff to notify:", uniqueStaff);

                                            let lastError = "";
                                            let successCount = 0;
                                            const notifiedNames: string[] = [];

                                            // Fetch names for uniqueStaff
                                            const { data: staffProfiles } = await supabase
                                                .from('users')
                                                .select('id, full_name')
                                                .in('id', uniqueStaff);

                                            for (const staffId of uniqueStaff) {
                                                if (staffId) {
                                                    console.log("DEBUG: Sending notification to:", staffId);
                                                    const result = await createNotificationAction({
                                                        userId: staffId,
                                                        title: "Tugasan Baru",
                                                        message: "Tugasan harian anda telah sedia. Sila semak senarai tugas anda.",
                                                        type: "info",
                                                        category: "task",
                                                        link: "/staff/tasks"
                                                    });
                                                    console.log("DEBUG: Notification result for", staffId, result);
                                                    if (result.success) {
                                                        successCount++;
                                                        const name = staffProfiles?.find(p => p.id === staffId)?.full_name || "Unknown";
                                                        notifiedNames.push(name);
                                                    } else {
                                                        lastError = result.error || "Unknown error";
                                                    }
                                                }
                                            }

                                            if (successCount > 0) {
                                                alert(`Notifikasi telah dihantar kepada ${successCount} staff:\n${notifiedNames.join(", ")}`);
                                            } else {
                                                alert(`Gagal menghantar notifikasi. Ralat terakhir: ${lastError}`);
                                            }
                                        } else {
                                            alert("Tiada tugasan ditemui untuk hari ini.");
                                        }
                                    } catch (err) {
                                        console.error("Error notifying staff:", err);
                                        alert("Ralat menghantar notifikasi.");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                            >
                                <Bell className="w-4 h-4" />
                                NOTIFY STAFF
                            </button>
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-400/10 text-green-400 text-xs font-bold ml-2">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                LIVE
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

                                {/* Progress Bar */}
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
                                    <button className="text-primary hover:text-white text-xs font-bold flex items-center gap-1">
                                        Lihat Detail
                                    </button>
                                </div>
                            </div>

                            {/* Recent Proof Preview */}
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
        </div>
    );
}
