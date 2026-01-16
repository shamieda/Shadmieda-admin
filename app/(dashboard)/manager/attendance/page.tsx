"use client";

import { useEffect, useState } from "react";
import { Search, Filter, Download, MapPin, Camera, Loader2, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { updateAttendanceAction } from "@/app/actions/update-attendance";

export default function AttendancePage() {
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchAttendance();
    }, [selectedDate]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('attendance')
                .select(`
                    *,
                    users:user_id (
                        full_name,
                        position
                    )
                `)
                .gte('clock_in', `${selectedDate}T00:00:00`)
                .lte('clock_in', `${selectedDate}T23:59:59`)
                .order('clock_in', { ascending: false });

            if (error) throw error;
            setAttendance(data || []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [editForm, setEditForm] = useState({ clock_in: "", status: "" });

    const handleDelete = async (id: string) => {
        if (!confirm("Adakah anda pasti mahu memadam rekod ini?")) return;

        try {
            const { error, count } = await supabase
                .from('attendance')
                .delete({ count: 'exact' })
                .eq('id', id);

            if (error) throw error;

            if (count === 0) {
                throw new Error("Tiada rekod dipadam. Sila semak kebenaran (RLS).");
            }

            setAttendance(attendance.filter(a => a.id !== id));
            alert("Rekod berjaya dipadam.");
        } catch (error: any) {
            console.error("Error deleting record:", error);
            alert("Gagal memadam rekod: " + error.message);
        }
    };

    const openEditModal = (record: any) => {
        setEditingRecord(record);
        // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
        const date = new Date(record.clock_in);
        // Adjust for local timezone offset manually to ensure correct display in input
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);

        setEditForm({
            clock_in: localISOTime,
            status: record.status || "Hadir"
        });
    };

    const handleUpdate = async () => {
        if (!editingRecord) return;
        setLoading(true);
        try {
            // Convert local time back to ISO string for storage
            const updatedTime = new Date(editForm.clock_in).toISOString();

            // Use server action with business logic
            const result = await updateAttendanceAction(
                editingRecord.id,
                updatedTime,
                editForm.status
            );

            if (!result.success) {
                throw new Error(result.error || "Gagal mengemaskini rekod.");
            }

            // Refresh attendance data from server to get updated penalty
            await fetchAttendance();
            setEditingRecord(null);
            alert(result.message || "Rekod berjaya dikemaskini.");
        } catch (error: any) {
            console.error("Error updating record:", error);
            alert("Gagal mengemaskini rekod: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredAttendance = attendance.filter(a =>
        a.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Rekod Kehadiran</h1>
                    <p className="text-gray-400 text-sm">Pantau masa masuk/keluar staff hari ini.</p>
                </div>

                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-white/10 rounded-lg text-sm text-white hover:bg-white/5">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-sm font-bold hover:bg-yellow-400">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Search & Date */}
            <div className="flex gap-4 bg-surface p-4 rounded-xl border border-white/5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Cari nama staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-primary"
                    />
                </div>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
            </div>

            {/* Table */}
            <div className="bg-surface border border-white/5 rounded-xl overflow-hidden">
                {loading && !editingRecord ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Memuatkan rekod kehadiran...</p>
                    </div>
                ) : filteredAttendance.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="w-8 h-8 text-gray-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Tiada Rekod Dijumpai</h3>
                        <p className="text-gray-500 text-sm">Tiada staff yang hadir pada tarikh ini.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 font-medium">Staff</th>
                                <th className="px-6 py-4 font-medium">Stesen</th>
                                <th className="px-6 py-4 font-medium">Masa Masuk</th>
                                <th className="px-6 py-4 font-medium">Lokasi</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Bukti</th>
                                <th className="px-6 py-4 font-medium text-right">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredAttendance.map((a) => (
                                <tr key={a.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                {a.users?.full_name?.substring(0, 3).toUpperCase() || "USR"}
                                            </div>
                                            <span className="font-medium text-white">{a.users?.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 capitalize">{a.users?.position || 'Staff'}</td>
                                    <td className="px-6 py-4 text-white">
                                        {new Date(a.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-green-400" />
                                        <span className="text-green-400">Dalam Premis</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${a.status === 'Late' ? 'bg-red-400/10 text-red-400' : 'bg-green-400/10 text-green-400'
                                            }`}>
                                            {a.status || 'Hadir'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {a.selfie_url ? (
                                            <a
                                                href={a.selfie_url.replace('via.placeholder.com', 'placehold.co').replace('.png', '/png')}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:text-yellow-300 text-xs flex items-center gap-1 ml-auto justify-end"
                                            >
                                                <Camera className="w-3 h-3" />
                                                Lihat Selfie
                                            </a>
                                        ) : (
                                            <span className="text-gray-600 text-xs italic">Tiada Foto</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(a)}
                                                className="p-2 text-gray-400 hover:text-primary transition-colors"
                                                title="Edit"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(a.id)}
                                                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                                title="Padam"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Edit Modal */}
            {editingRecord && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface border border-white/10 rounded-xl p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-bold text-white">Kemaskini Rekod</h3>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 uppercase font-bold">Masa Masuk</label>
                            <input
                                type="datetime-local"
                                value={editForm.clock_in}
                                onChange={(e) => setEditForm({ ...editForm, clock_in: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 uppercase font-bold">Status</label>
                            <select
                                value={editForm.status}
                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                            >
                                <option value="Hadir">Hadir (On Time)</option>
                                <option value="Late">Lewat (Late)</option>
                            </select>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setEditingRecord(null)}
                                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg font-bold hover:bg-white/20"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-primary text-black rounded-lg font-bold hover:bg-yellow-400 disabled:opacity-50"
                            >
                                {loading ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
