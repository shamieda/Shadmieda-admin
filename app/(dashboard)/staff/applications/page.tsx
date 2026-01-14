"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Calendar, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export default function StaffApplicationsPage() {
    const [loading, setLoading] = useState(false);
    const [applications, setApplications] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        type: 'Cuti Sakit',
        start_date: '',
        end_date: '',
        reason: ''
    });

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user DB ID
            const { data: userData } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
            if (!userData) return;

            const { data, error } = await supabase
                .from('leave_applications')
                .select('*')
                .eq('user_id', userData.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (error) {
            console.error("Error fetching applications:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const { data: userData } = await supabase.from('users').select('id, full_name').eq('auth_id', user.id).single();
            if (!userData) throw new Error("User record not found");

            const { error } = await supabase
                .from('leave_applications')
                .insert([{
                    user_id: userData.id,
                    type: formData.type,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    reason: formData.reason,
                    status: 'Pending'
                }]);

            if (error) throw error;

            // Notify Managers
            const { createNotificationAction } = await import('@/app/actions/notifications');

            // Fetch all managers/admins
            const { data: managers } = await supabase
                .from('users')
                .select('id')
                .in('role', ['manager', 'admin', 'master']);

            if (managers) {
                for (const manager of managers) {
                    await createNotificationAction({
                        userId: manager.id,
                        title: "Permohonan Baru Staff",
                        message: `${userData.full_name || 'Staff'} memohon ${formData.type} : ${formData.reason}`,
                        type: "info",
                        category: "system", // or 'application' if added to types
                        link: "/manager/applications" // Future page
                    });
                }
            }

            alert("Permohonan berjaya dihantar! Pihak pengurusan telah dimaklumkan.");
            setShowForm(false);
            setFormData({ type: 'Cuti Sakit', start_date: '', end_date: '', reason: '' });
            fetchApplications();

        } catch (error: any) {
            console.error("Submit Error:", error);
            if (error.code === '42P01') {
                alert("RALAT DATABASE: Table 'leave_applications' belum wujud. Sila minta Admin run script database.");
            } else {
                alert(`Gagal menghantar permohonan: ${error.message}`);
            }
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

    return (
        <div className="p-4 md:p-8 space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary" />
                        Permohonan
                    </h1>
                    <p className="text-gray-400 mt-1">Mohon cuti, kecemasan, atau lain-lain.</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-primary text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-400 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        PERMOHONAN BARU
                    </button>
                )}
            </header>

            {/* Application Form */}
            {showForm && (
                <div className="bg-surface border border-white/10 rounded-xl p-6 animate-fade-in">
                    <h3 className="text-xl font-bold text-white mb-6">Butiran Permohonan</h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Jenis Permohonan</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
                                >
                                    <option value="Cuti Sakit">Cuti Sakit (MC)</option>
                                    <option value="Cuti Tahunan">Cuti Tahunan</option>
                                    <option value="Kecemasan">Kecemasan (EL)</option>
                                    <option value="Lain-lain">Lain-lain</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Tarikh Mula</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">Tarikh Tamat</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Sebab / Catatan</label>
                            <textarea
                                required
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Sila nyatakan sebab permohonan..."
                                className="w-full h-32 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-primary text-black font-bold px-6 py-2 rounded-lg hover:bg-yellow-400 transition-all flex items-center gap-2"
                            >
                                {loading ? "Sedang Hantar..." : "HANTAR PERMOHONAN"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Applications List */}
            <div className="grid grid-cols-1 gap-4">
                {applications.length === 0 && !loading ? (
                    <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5 border-dashed">
                        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <h3 className="text-gray-400 font-bold">Tiada Rekod Permohonan</h3>
                        <p className="text-gray-500 text-sm">Rekod permohonan anda akan dipaparkan di sini.</p>
                    </div>
                ) : (
                    applications.map((app: any) => (
                        <div key={app.id} className="bg-surface p-5 rounded-xl border border-white/5 flex gap-4 items-start hover:border-white/10 transition-all">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${app.type === 'Cuti Sakit' ? 'bg-red-500/20 text-red-400' :
                                app.type === 'Cuti Tahunan' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-gray-500/20 text-gray-400'
                                }`}>
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-white text-lg">{app.type}</h4>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${getStatusColor(app.status)}`}>
                                        {app.status === 'Pending' && <Clock className="w-3 h-3" />}
                                        {app.status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                                        {app.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                                        {app.status}
                                    </span>
                                </div>
                                <p className="text-gray-300 mb-2">{app.reason}</p>
                                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(app.start_date), 'dd MMM yyyy')} - {format(new Date(app.end_date), 'dd MMM yyyy')}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Dipohon pada: {format(new Date(app.created_at), 'dd/MM/yyyy')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
