"use client";

import { useEffect, useState } from "react";
import { Search, Filter, Download, MapPin, Camera, Loader2, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { updateAttendanceAction } from "@/app/actions/update-attendance";

export default function SupervisorAttendancePage() {
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

    const openEditModal = (record: any) => {
        setEditingRecord(record);
        // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
        const date = new Date(record.clock_in);
        // Adjust for local timezone offset manually to ensure correct display in input
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);

        setEditForm({
            clock_in: localISOTime,
            status: record.status || "present"
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

    const [users, setUsers] = useState<any[]>([]);
    const [createModal, setCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        userId: "",
        clock_in: new Date().toISOString().slice(0, 16),
        status: "present"
    });
    const [selfieFile, setSelfieFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            const { data } = await supabase.from('users').select('id, full_name, role').order('full_name');
            setUsers(data || []);
        };
        fetchUsers();
    }, []);

    const handleCreate = async () => {
        if (!createForm.userId || !createForm.clock_in) {
            alert("Sila pilih staff dan masa.");
            return;
        }

        setLoading(true);
        try {
            let selfieUrl = "";

            // Upload Selfie if exists
            if (selfieFile) {
                const fileExt = selfieFile.name.split('.').pop();
                const fileName = `${createForm.userId}_manual_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('attendance-selfies')
                    .upload(fileName, selfieFile);

                if (uploadError) {
                    console.error("Upload error:", uploadError);
                    if (!confirm("Gagal muat naik gambar. Teruskan tanpa gambar?")) {
                        throw new Error("Dibatalkan oleh pengguna.");
                    }
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('attendance-selfies')
                        .getPublicUrl(fileName);
                    selfieUrl = publicUrl;
                }
            }

            // Import dynamically to avoid build issues if file is new
            const { createManualAttendanceAction } = await import("@/app/actions/create-attendance");
            const result = await createManualAttendanceAction(
                createForm.userId,
                new Date(createForm.clock_in).toISOString(),
                createForm.status,
                selfieUrl
            );

            if (!result.success) throw new Error(result.error);

            alert(result.message);
            setCreateModal(false);
            setSelfieFile(null); // Reset file
            fetchAttendance();
        } catch (error: any) {
            alert("Gagal: " + error.message);
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
                    <h1 className="text-2xl font-bold text-white">Urus Kehadiran (Supervisor)</h1>
                    <p className="text-gray-400 text-sm">Kemaskini kehadiran staff jika terdapat masalah teknikal.</p>
                </div>
                <button
                    onClick={() => setCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg font-bold hover:bg-yellow-400"
                >
                    <User className="w-4 h-4" />
                    Catat Manual
                </button>
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
            <div className="bg-surface border border-white/5 rounded-xl overflow-x-auto">
                {loading && !editingRecord && !createModal ? (
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
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${a.status?.toLowerCase() === 'late' ? 'bg-red-400/10 text-red-400' :
                                            a.status?.toLowerCase() === 'absent' ? 'bg-orange-400/10 text-orange-400' :
                                                'bg-green-400/10 text-green-400'
                                            }`}>
                                            {a.status?.toLowerCase() === 'late' ? 'Lewat' :
                                                a.status?.toLowerCase() === 'absent' ? 'Ponteng' :
                                                    'Hadir'}
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
                                        <button
                                            onClick={() => openEditModal(a)}
                                            className="p-2 text-gray-400 hover:text-primary transition-colors"
                                            title="Edit"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Manual Attendance Modal */}
            {createModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface border border-white/10 rounded-xl p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-bold text-white">Catat Kehadiran Secara Manual</h3>
                        <p className="text-xs text-gray-400">Gunakan ini untuk staff yang gagal clock-in kerana masalah telefon/internet.</p>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 uppercase font-bold">Pilih Staff</label>
                            <select
                                value={createForm.userId}
                                onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                            >
                                <option value="">-- Pilih Staff --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 uppercase font-bold">Masa Masuk</label>
                            <input
                                type="datetime-local"
                                value={createForm.clock_in}
                                onChange={(e) => setCreateForm({ ...createForm, clock_in: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 uppercase font-bold">Status</label>
                            <select
                                value={createForm.status}
                                onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                            >
                                <option value="present">Hadir (On Time)</option>
                                <option value="late">Lewat (Late)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 uppercase font-bold">Bukti Selfie (Pilihan)</label>
                            <div className="flex items-center gap-2">
                                <label className="flex-1 cursor-pointer bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white hover:bg-white/5 transition-colors flex items-center justify-between">
                                    <span className="text-sm truncate">
                                        {selfieFile ? selfieFile.name : "Ambil Gambar / Upload"}
                                    </span>
                                    <Camera className="w-4 h-4 text-gray-400" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setSelfieFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                </label>
                                {selfieFile && (
                                    <button
                                        onClick={() => setSelfieFile(null)}
                                        className="p-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"
                                    >
                                        <div className="w-4 h-4 font-bold">✕</div>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setCreateModal(false)}
                                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg font-bold hover:bg-white/20"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-primary text-black rounded-lg font-bold hover:bg-yellow-400 disabled:opacity-50"
                            >
                                {loading ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal (Existing) */}
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
                                <option value="present">Hadir (On Time)</option>
                                <option value="late">Lewat (Late)</option>
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
