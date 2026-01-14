"use client";

import { useState, useEffect } from "react";
import { FileText, Calendar, CheckCircle, XCircle, Clock, User, Check, X, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { createNotificationAction } from "@/app/actions/notifications";

export default function ManagerApplicationsPage() {
    const [loading, setLoading] = useState(false);
    const [applications, setApplications] = useState<any[]>([]);
    const [filter, setFilter] = useState('Pending'); // Pending, Approved, Rejected, All

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('leave_applications')
                .select(`
                    *,
                    users (
                        full_name,
                        position,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (error) {
            console.error("Error fetching applications:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: 'Approved' | 'Rejected', userId: string, type: string) => {
        // Optimistic UI could be implemented here, but for now just showing loading
        setLoading(true);
        try {
            const { error } = await supabase
                .from('leave_applications')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Notify Staff
            await createNotificationAction({
                userId: userId,
                title: `Permohonan ${newStatus === 'Approved' ? 'Diluluskan' : 'Ditolak'}`,
                message: `Permohonan ${type} anda telah ${newStatus === 'Approved' ? 'diluluskan' : 'ditolak'} oleh pengurusan.`,
                type: newStatus === 'Approved' ? "success" : "error",
                category: "system",
                link: "/staff/applications"
            });

            // alert(`Permohonan berjaya ${newStatus === 'Approved' ? 'diluluskan' : 'ditolak'}!`); // Removed alert for smoother flow
            fetchApplications();
        } catch (error: any) {
            alert(`Ralat: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'rejected': return 'text-red-400 border-red-400/30 bg-red-400/10';
            default: return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
        }
    };

    // Filter Logic
    const filteredApps = applications.filter(app => {
        if (filter === 'All') return true;
        return app.status === filter;
    });

    return (
        <div className="p-4 md:p-8 space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary" />
                        Pengurusan Permohonan
                    </h1>
                    <p className="text-gray-400 mt-1">Semak dan luluskan permohonan cuti staff.</p>
                </div>

                <div className="flex bg-black/50 p-1 rounded-lg border border-white/10">
                    {['Pending', 'Approved', 'Rejected', 'All'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filter === f ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {f === 'All' ? 'Semua' : f}
                        </button>
                    ))}
                </div>
            </header>

            <div className="grid grid-cols-1 gap-4">
                {filteredApps.length === 0 ? (
                    <div className="text-center py-20 bg-surface rounded-xl border border-white/5 border-dashed">
                        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <h3 className="text-gray-400 font-bold">Tiada Permohonan {filter !== 'All' ? filter : ''}</h3>
                        <p className="text-gray-500 text-sm">Tiada rekod ditemui untuk status ini.</p>
                    </div>
                ) : (
                    filteredApps.map((app) => (
                        <div key={app.id} className="bg-surface p-6 rounded-xl border border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row gap-6">
                            {/* Staff Info */}
                            <div className="flex items-start gap-4 md:w-1/4 min-w-[200px]">
                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                    {app.users?.avatar_url ? (
                                        <img src={app.users.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-6 h-6 text-gray-400" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-white truncate">{app.users?.full_name || 'Staff Unknown'}</h4>
                                    <p className="text-xs text-primary uppercase font-bold tracking-wider">{app.users?.position || 'Staff'}</p>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {format(new Date(app.created_at), 'dd/MM/yyyy')}
                                    </p>
                                </div>
                            </div>

                            {/* Application Details */}
                            <div className="flex-1 space-y-3 border-l md:border-l border-white/5 md:pl-6 pl-0 border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-xs font-bold text-gray-500 uppercase mb-1 block">Jenis Permohonan</span>
                                        <h3 className="text-xl font-bold text-white mb-1">{app.type}</h3>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${getStatusColor(app.status)}`}>
                                        {app.status}
                                    </span>
                                </div>

                                <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                                    <p className="text-gray-300 italic">"{app.reason}"</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <span className="text-white font-bold">{format(new Date(app.start_date), 'dd MMM')}</span>
                                        <span>hingga</span>
                                        <span className="text-white font-bold">{format(new Date(app.end_date), 'dd MMM yyyy')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            {app.status === 'Pending' && (
                                <div className="flex md:flex-col gap-3 md:w-32 justify-center border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 mt-2 md:mt-0">
                                    <button
                                        onClick={() => handleStatusUpdate(app.id, 'Approved', app.user_id, app.type)}
                                        disabled={loading}
                                        className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg p-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Luluskan"
                                    >
                                        <Check className="w-5 h-5" />
                                        <span className="text-[10px] font-bold uppercase">Lulus</span>
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate(app.id, 'Rejected', app.user_id, app.type)}
                                        disabled={loading}
                                        className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg p-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Tolak"
                                    >
                                        <X className="w-5 h-5" />
                                        <span className="text-[10px] font-bold uppercase">Tolak</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
