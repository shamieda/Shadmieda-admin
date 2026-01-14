"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, MoreHorizontal, FileText, Loader2, User, Trash2, Edit, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { deleteStaffAction } from "@/app/actions/delete-staff";

export default function StaffListPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [showSuratModal, setShowSuratModal] = useState<string | null>(null);

    const [positions, setPositions] = useState<string[]>([]);
    const [stationModal, setStationModal] = useState<{ id: string, name: string, currentStation: string } | null>(null);

    useEffect(() => {
        fetchStaff();
        fetchPositions();
    }, []);

    const fetchPositions = async () => {
        const { data } = await supabase.from('positions').select('name');
        if (data) setPositions(data.map((p: any) => p.name));
    };

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'staff')
                .order('full_name', { ascending: true });

            if (error) throw error;
            setStaff(data || []);
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStation = async (newStation: string) => {
        if (!stationModal) return;
        try {
            const { error } = await supabase
                .from('users')
                .update({ position: newStation })
                .eq('id', stationModal.id);

            if (error) throw error;

            setStaff(staff.map((s: any) => s.id === stationModal.id ? { ...s, position: newStation } : s));
            setStationModal(null);

            // Universal Sync will automatically detect changes if we wanted to be fancy, 
            // but for now the database is the source of truth for the NEXT sync.
            // If we want instant task update for today, we might need to trigger it, 
            // but the requirement is just to change station.


        } catch (error: any) {
            alert("Gagal kemaskini stesen: " + error.message);
        }
    };


    const handleDeleteStaff = async (id: string, authId?: string) => {
        if (!confirm("Adakah anda pasti mahu pemadam staff ini? Tindakan ini tidak boleh dikembalikan.")) return;

        try {
            const result = await deleteStaffAction(id, authId);

            if (!result.success) {
                throw new Error(result.error);
            }

            setStaff(staff.filter((s: any) => s.id !== id));
            setActiveMenu(null);
        } catch (error: any) {
            alert(`Gagal memadam staff: ${error.message}`);
        }
    };

    const filteredStaff = staff.filter((s: any) =>
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.ic_number?.includes(searchQuery)
    );

    return (
        <div className="space-y-6" onClick={() => setActiveMenu(null)}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Pengurusan Staff</h1>
                    <p className="text-gray-400 text-sm">Senarai pekerja dan rekod peribadi.</p>
                </div>

                <Link
                    href="/manager/staff/onboard"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-sm font-bold hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Daftar Staff Baru
                </Link>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Cari nama staff atau IC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-primary transition-all"
                />
            </div>

            {/* Staff Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p>Memuatkan senarai staff...</p>
                </div>
            ) : filteredStaff.length === 0 ? (
                <div className="bg-surface border border-white/5 rounded-2xl p-20 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <User className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Tiada Staff Dijumpai</h3>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">Sila daftar staff baru untuk mula mengurus.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStaff.map((s: any) => (
                        <div key={s.id} className="bg-surface border border-white/5 rounded-xl p-6 hover:border-primary/30 transition-all group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary overflow-hidden">
                                    {s.avatar_url ? (
                                        <img src={s.avatar_url} alt={s.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        s.full_name?.substring(0, 3).toUpperCase() || "USR"
                                    )}
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(activeMenu === s.id ? null : s.id);
                                        }}
                                        className="text-gray-500 hover:text-white transition-colors p-1"
                                    >
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>

                                    {activeMenu === s.id && (
                                        <div className="absolute right-0 top-8 w-48 bg-black border border-white/10 rounded-lg shadow-xl z-10 overflow-hidden">
                                            <Link
                                                href={`/manager/staff/${s.id}`}
                                                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors w-full text-left"
                                            >
                                                <Edit className="w-4 h-4" />
                                                Edit Profil
                                            </Link>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteStaff(s.id, s.auth_id);
                                                }}
                                                className="flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full text-left"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Padam Staff
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white">{s.full_name}</h3>
                            <div className="flex items-center gap-2 mb-4">
                                <p className="text-primary text-sm font-medium capitalize">Stesen: {s.position || 'Staff'} ({s.employment_type || 'Full-Time'})</p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setStationModal({ id: s.id, name: s.full_name, currentStation: s.position || 'Staff' });
                                    }}
                                    className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-primary transition-colors"
                                    title="Tukar Stesen"
                                >
                                    <Edit className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="space-y-2 text-sm text-gray-400">
                                <p className="flex items-center gap-2">
                                    <span className="text-xs opacity-50">📞</span> {s.phone || 'Tiada No. Telefon'}
                                </p>
                                <p className="flex items-center gap-2">
                                    <span className="text-xs opacity-50">💳</span> {s.bank_name || 'Bank'} • {s.bank_account || 'No. Akaun'}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                                <Link
                                    href={`/manager/staff/${s.id}`}
                                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white transition-colors text-center"
                                >
                                    Lihat Profil
                                </Link>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowSuratModal(s.id);
                                    }}
                                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white transition-colors flex items-center justify-center gap-1"
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    Surat
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Station Change Modal */}
            {stationModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setStationModal(null)}>
                    <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Tukar Stesen</h3>
                            <button onClick={() => setStationModal(null)} className="text-gray-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-gray-400 mb-2">Pilih stesen baru untuk <span className="text-white font-bold">{stationModal.name}</span>:</p>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {positions.map((pos: string) => (
                                    <button
                                        key={pos}
                                        onClick={() => handleUpdateStation(pos)}
                                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${stationModal.currentStation === pos
                                            ? 'bg-primary/10 border-primary text-primary font-bold'
                                            : 'bg-white/5 border-transparent hover:border-white/20 text-gray-300'
                                            }`}
                                    >
                                        {pos}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Surat Modal */}
            {showSuratModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowSuratModal(null)}>
                    <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Jana Surat</h3>
                            <button onClick={() => setShowSuratModal(null)} className="text-gray-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <button className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-left flex items-center justify-between group transition-colors">
                                <span className="text-gray-300 group-hover:text-white font-medium">Surat Tawaran Kerja</span>
                                <FileText className="w-4 h-4 text-gray-500 group-hover:text-primary" />
                            </button>
                            <button className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-left flex items-center justify-between group transition-colors">
                                <span className="text-gray-300 group-hover:text-white font-medium">Surat Amaran</span>
                                <FileText className="w-4 h-4 text-gray-500 group-hover:text-red-400" />
                            </button>
                            <button className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-left flex items-center justify-between group transition-colors">
                                <span className="text-gray-300 group-hover:text-white font-medium">Surat Penamatan</span>
                                <FileText className="w-4 h-4 text-gray-500 group-hover:text-red-400" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
